from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.report import ReportResponse
from app.models.project import Project
from app.models.report import Report, Issue
from app.models.user import User
from app.api.deps import get_current_user
from app.services.analyzer import CodeAnalyzer
from bson.errors import InvalidId
import tempfile
import zipfile
import os
import shutil
import subprocess
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    project = Project(
        name=project_in.name,
        description=project_in.description,
        owner_id=str(current_user.id),
        repository_url=project_in.repository_url,
        language=project_in.language,
    )
    await project.insert()
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        repository_url=project.repository_url,
        files_count=project.files_count,
        language=project.language,
        created_at=project.created_at,
    )

@router.get("/", response_model=List[ProjectResponse])
async def read_projects(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 10
):
    projects = await Project.find(Project.owner_id == str(current_user.id)).skip(skip).limit(limit).to_list()
    return [
        ProjectResponse(
            id=str(p.id),
            name=p.name,
            description=p.description,
            owner_id=p.owner_id,
            repository_url=p.repository_url,
            files_count=p.files_count,
            language=p.language,
            created_at=p.created_at,
        ) for p in projects
    ]

@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        project = await Project.get(project_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid project ID format")
        
    if not project or project.owner_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Project not found")
        
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        repository_url=project.repository_url,
        files_count=project.files_count,
        language=project.language,
        created_at=project.created_at,
    )

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        project = await Project.get(project_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid project ID format")
        
    if not project or project.owner_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Delete all associated reports
    reports = await Report.find(Report.project_id == project_id).to_list()
    for r in reports:
        await r.delete()
        
    await project.delete()
    return None

@router.post("/{project_id}/analyze", response_model=ReportResponse)
async def analyze_project(
    project_id: str,
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    try:
        project = await Project.get(project_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid project ID format")
        
    if not project or project.owner_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Project not found")

    temp_dir = tempfile.mkdtemp()
    try:
        if file:
            # Handle ZIP file upload
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Extract ZIP
            if zipfile.is_zipfile(file_path):
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                os.remove(file_path) # remove zip archive itself
            else:
                # If a single flat code file was uploaded rather than a ZIP
                pass
        elif project.repository_url:
            # Handle cloning repository URL
            logger.info(f"Cloning repository: {project.repository_url}")
            try:
                # Add environment variable to ignore interactive prompts
                env = os.environ.copy()
                env["GIT_TERMINAL_PROMPT"] = "0"
                result = subprocess.run(
                    ["git", "clone", "--depth", "1", project.repository_url, "repo"],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    env=env,
                    timeout=30
                )
                if result.returncode != 0:
                    logger.warning(f"Git clone failed: {result.stderr}")
                    raise HTTPException(status_code=400, detail="Failed to clone repository. Make sure the URL is public and valid.")
            except Exception as clone_err:
                logger.warning(f"Git clone exception: {clone_err}")
                raise HTTPException(status_code=400, detail="Error occurred while attempting to clone the repository.")
        else:
            # No files uploaded and no repo URL provided
            raise HTTPException(status_code=400, detail="No code files uploaded and no repository URL provided for analysis.")

        # Run analysis (non-blocking)
        analysis_res = await run_in_threadpool(CodeAnalyzer.analyze_project, temp_dir)
        
        # Read analyzed files count
        files_scanned = CodeAnalyzer.read_project_files(temp_dir)
        files_count = len(files_scanned)
        
        # Update project file count
        project.files_count = files_count
        await project.save()

        # Save analysis report
        issues_list = []
        for issue_data in analysis_res.get("issues", []):
            issues_list.append(Issue(
                file_path=issue_data.get("file_path"),
                line_number=issue_data.get("line_number"),
                severity=issue_data.get("severity"),
                category=issue_data.get("category"),
                description=issue_data.get("description"),
                code_snippet=issue_data.get("code_snippet"),
                suggestion=issue_data.get("suggestion")
            ))

        report = Report(
            project_id=project_id,
            overall_score=analysis_res.get("overall_score", 100),
            summary=analysis_res.get("summary", ""),
            metrics=analysis_res.get("metrics", {"security": 100, "quality": 100, "performance": 100, "maintainability": 100}),
            issues=issues_list
        )
        await report.insert()

        return ReportResponse(
            id=str(report.id),
            project_id=report.project_id,
            overall_score=report.overall_score,
            summary=report.summary,
            metrics=report.metrics,
            issues=[
                {
                    "file_path": i.file_path,
                    "line_number": i.line_number,
                    "severity": i.severity,
                    "category": i.category,
                    "description": i.description,
                    "code_snippet": i.code_snippet,
                    "suggestion": i.suggestion
                } for i in report.issues
            ],
            created_at=report.created_at
        )

    except Exception as e:
        logger.error(f"Analysis handler failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error performing project analysis: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@router.get("/{project_id}/reports", response_model=List[ReportResponse])
async def get_project_reports(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        project = await Project.get(project_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid project ID format")
        
    if not project or project.owner_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Project not found")

    reports = await Report.find(Report.project_id == project_id).sort("-created_at").to_list()
    return [
        ReportResponse(
            id=str(r.id),
            project_id=r.project_id,
            overall_score=r.overall_score,
            summary=r.summary,
            metrics=r.metrics,
            issues=[
                {
                    "file_path": i.file_path,
                    "line_number": i.line_number,
                    "severity": i.severity,
                    "category": i.category,
                    "description": i.description,
                    "code_snippet": i.code_snippet,
                    "suggestion": i.suggestion
                } for i in r.issues
            ],
            created_at=r.created_at
        ) for r in reports
    ]

@router.get("/{project_id}/reports/{report_id}", response_model=ReportResponse)
async def get_project_report(
    project_id: str,
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        project = await Project.get(project_id)
        report = await Report.get(report_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid project or report ID format")
        
    if not project or project.owner_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not report or report.project_id != project_id:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportResponse(
        id=str(report.id),
        project_id=report.project_id,
        overall_score=report.overall_score,
        summary=report.summary,
        metrics=report.metrics,
        issues=[
            {
                "file_path": i.file_path,
                "line_number": i.line_number,
                "severity": i.severity,
                "category": i.category,
                "description": i.description,
                "code_snippet": i.code_snippet,
                "suggestion": i.suggestion
            } for i in report.issues
        ],
        created_at=report.created_at
    )

