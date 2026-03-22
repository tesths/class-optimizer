# -*- coding: utf-8 -*-
"""Import API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import ClassTeacher
from app.services.excel_service import generate_template, preview_import, execute_import
from app.schemas.import_job import ImportJobResponse

router = APIRouter(prefix="/classes/{class_id}/students/import", tags=["导入"])


def check_class_admin(db: Session, class_id: int, user_id: int) -> bool:
    """Check if user is class admin"""
    ct = db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id,
        ClassTeacher.user_id == user_id,
        ClassTeacher.role == "class_admin"
    ).first()
    return ct is not None


@router.get("/template")
async def download_template(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download Excel template"""
    if not check_class_admin(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")
    template = generate_template()
    return Response(
        content=template,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=student_import_template.xlsx"}
    )


@router.post("/preview")
async def preview_student_import(
    class_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview import without committing"""
    if not check_class_admin(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")

    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只支持 .xlsx 或 .xls 文件")

    content = await file.read()
    result = preview_import(content, class_id, db)
    return result


@router.post("/commit", response_model=ImportJobResponse)
async def commit_student_import(
    class_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute actual import"""
    if not check_class_admin(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")

    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只支持 .xlsx 或 .xls 文件")

    content = await file.read()
    job = execute_import(content, class_id, current_user.id, db)
    return job
