import os
import sys
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError

# Ensure root project directory and Backend directory are in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from config import get_settings
from database import (
    candidates_collection,
    jobs_collection,
    check_database_connection,
)
from db import connect_to_mongo, close_mongo_connection
from routes.plans import router as plans_router
from routes.questions import router as questions_router
from services.candidate_profile import (
    build_candidate_profile,
    compare_candidate_to_job,
)
from services.skill_analysis import analyze_job

logger = logging.getLogger("uvicorn")

# Shared AI Models state (Loaded once at startup)
app_state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP LOGIC ---
    settings = get_settings()
    logger.info("Starting up application...")

    # 1. Connect to MongoDB
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB async client on startup: {e}")

    # 2. Warm up embedding model for De-duplication
    try:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}...")
        from sentence_transformers import SentenceTransformer

        model_instance = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        app_state["embedding_model"] = model_instance
        app.state.embedding_model = model_instance
        logger.info("Embedding model loaded successfully!")
    except Exception as e:
        logger.warning(f"Could not load SentenceTransformer on startup: {e}")

    yield

    # --- SHUTDOWN LOGIC ---
    logger.info("Shutting down application...")
    await close_mongo_connection()


settings = get_settings()

app = FastAPI(
    title="AI-Based Interview Question Generator API",
    description="Resume analysis, skill evaluation, and interview plan orchestration",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Section C Routers
app.include_router(plans_router)
app.include_router(questions_router)


# Request Models
class CandidateAnalysisRequest(BaseModel):
    role_title: str = Field(..., min_length=1)
    job_description: str = Field(..., min_length=1)
    resume_text: str | None = None
    resume_pdf_path: str | None = None


class CreateJobRequest(BaseModel):
    role_title: str = Field(..., min_length=1, max_length=200)
    job_description: str = Field(..., min_length=1)


class CreateCandidateRequest(BaseModel):
    candidate_name: str | None = Field(default=None, max_length=200)
    resume_text: str | None = None
    resume_pdf_path: str | None = None


class SkillWeightUpdate(BaseModel):
    name: str = Field(..., min_length=1)
    weight: float = Field(..., gt=0)


class UpdateJobSkillsRequest(BaseModel):
    skills: list[SkillWeightUpdate] = Field(..., min_length=1)


def serialize_document(document: dict[str, Any]) -> dict[str, Any]:
    """Convert MongoDB values into JSON-friendly values."""
    result = dict(document)
    result["id"] = str(result.pop("_id"))
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def normalize_weights(skills: list[dict[str, Any]]) -> None:
    total = sum(float(skill["weight"]) for skill in skills)
    if total <= 0:
        raise ValueError("The total skill weight must be greater than zero.")

    for skill in skills:
        skill["normalized_weight"] = round(float(skill["weight"]) / total, 6)

    # Correct rounding drift so the displayed values sum to 1.
    if skills:
        drift = round(1.0 - sum(skill["normalized_weight"] for skill in skills), 6)
        skills[-1]["normalized_weight"] = round(skills[-1]["normalized_weight"] + drift, 6)


# Root and Health Endpoints
@app.get("/")
def root() -> dict[str, Any]:
    return {
        "success": True,
        "message": "AI-Based Interview Question Generator API is running",
    }


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    from db import get_database

    db = get_database()
    db_status = "connected" if db is not None or check_database_connection() else "disconnected"

    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "embedding_model_loaded": "embedding_model" in app_state,
    }


# Standardized Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception caught on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "An unexpected server error occurred.",
            "detail": str(exc),
            "path": str(request.url.path),
        },
    )


# Section A Endpoints
@app.post("/api/analysis/candidate")
def analyze_candidate(request: CandidateAnalysisRequest) -> dict[str, Any]:
    """Compare a candidate resume against a job description."""
    if bool(request.resume_text) == bool(request.resume_pdf_path):
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one of resume_text or resume_pdf_path.",
        )

    try:
        candidate = build_candidate_profile(
            resume_text=request.resume_text,
            resume_pdf_path=request.resume_pdf_path,
        )
        job = analyze_job(
            request.job_description,
            role_title=request.role_title,
        )
        comparison = compare_candidate_to_job(
            candidate,
            job,
            job_description=request.job_description,
        )

        return {
            "success": True,
            "message": "Candidate analysis completed",
            "data": {
                "candidate_profile": candidate,
                "job_analysis": job,
                "comparison": comparison,
            },
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="The specified resume PDF was not found.",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Candidate analysis failed")
        raise HTTPException(
            status_code=500,
            detail="Candidate analysis failed. Check backend logs.",
        )


@app.post("/api/jobs", status_code=status.HTTP_201_CREATED)
def create_job(request: CreateJobRequest) -> dict[str, Any]:
    """Analyze a job description and save the analysis to MongoDB."""
    try:
        analysis = analyze_job(
            request.job_description,
            role_title=request.role_title,
        )

        document = {
            "role_title": request.role_title.strip(),
            "job_description": request.job_description.strip(),
            "analysis": analysis,
            "weighted_skills": analysis.get("weighted_skills", []),
            "low_info": analysis.get("low_info", False),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        result = jobs_collection.insert_one(document)
        saved = jobs_collection.find_one({"_id": result.inserted_id})

        return {
            "success": True,
            "message": "Job analyzed and saved",
            "data": serialize_document(saved),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PyMongoError:
        logger.exception("Could not save job")
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Check MongoDB Atlas configuration.",
        )


@app.patch("/api/jobs/{job_id}/skills")
def update_job_skills(
    job_id: str,
    request: UpdateJobSkillsRequest,
) -> dict[str, Any]:
    """Update skill weights and synchronize competency groups."""
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID.")

    try:
        job = jobs_collection.find_one({"_id": ObjectId(job_id)})

        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")

        current_skills = job.get("weighted_skills", [])

        skills_by_name = {
            skill["name"].casefold(): dict(skill)
            for skill in current_skills
        }

        # Reject duplicate skill names in the same request.
        submitted_names = [
            item.name.strip().casefold()
            for item in request.skills
        ]

        if len(submitted_names) != len(set(submitted_names)):
            raise HTTPException(
                status_code=400,
                detail="Each skill can be updated only once per request.",
            )

        # Update the requested raw weights.
        for item in request.skills:
            key = item.name.strip().casefold()

            if key not in skills_by_name:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Skill '{item.name}' was not found "
                        "in this job analysis."
                    ),
                )

            skills_by_name[key]["weight"] = item.weight

        updated_skills = list(skills_by_name.values())

        # Recalculate normalized weights across all job skills.
        normalize_weights(updated_skills)

        # Build a lookup of the updated skill records.
        updated_by_name = {
            skill["name"].casefold(): skill
            for skill in updated_skills
        }

        analysis = dict(job.get("analysis", {}))
        analysis["weighted_skills"] = updated_skills

        # Synchronize the nested competency groups.
        competency_groups = []

        for original_group in analysis.get("competency_groups", []):
            group = dict(original_group)
            refreshed_skills = []

            for original_skill in original_group.get("skills", []):
                skill_name = original_skill["name"].casefold()
                updated_skill = updated_by_name.get(skill_name)

                if updated_skill is not None:
                    refreshed_skills.append(dict(updated_skill))
                else:
                    refreshed_skills.append(dict(original_skill))

            group["skills"] = refreshed_skills
            group["skill_count"] = len(refreshed_skills)
            group["total_weight"] = round(
                sum(skill["weight"] for skill in refreshed_skills),
                6,
            )
            group["total_normalized_weight"] = round(
                sum(
                    skill["normalized_weight"]
                    for skill in refreshed_skills
                ),
                6,
            )

            competency_groups.append(group)

        analysis["competency_groups"] = competency_groups

        # Refresh the summary.
        analysis["summary"] = dict(analysis.get("summary", {}))
        analysis["summary"]["normalized_weight_sum"] = round(
            sum(
                skill["normalized_weight"]
                for skill in updated_skills
            ),
            6,
        )

        # Persist both copies of the analysis.
        jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "weighted_skills": updated_skills,
                    "analysis": analysis,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        saved = jobs_collection.find_one({"_id": ObjectId(job_id)})

        return {
            "success": True,
            "message": "Job skill weights updated",
            "data": serialize_document(saved),
        }

    except HTTPException:
        raise

    except PyMongoError:
        logger.exception("Could not update job skills")
        raise HTTPException(
            status_code=503,
            detail=(
                "Database unavailable. "
                "Check MongoDB Atlas configuration."
            ),
        )


@app.post("/api/candidates", status_code=status.HTTP_201_CREATED)
def create_candidate(request: CreateCandidateRequest) -> dict[str, Any]:
    """Parse a resume and save the resulting candidate profile."""
    if bool(request.resume_text) == bool(request.resume_pdf_path):
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one of resume_text or resume_pdf_path.",
        )

    try:
        profile = build_candidate_profile(
            resume_text=request.resume_text,
            resume_pdf_path=request.resume_pdf_path,
        )

        document = {
            "candidate_name": (
                request.candidate_name.strip()
                if request.candidate_name
                else None
            ),
            "profile": profile,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        result = candidates_collection.insert_one(document)
        saved = candidates_collection.find_one({"_id": result.inserted_id})

        return {
            "success": True,
            "message": "Candidate profile created",
            "data": serialize_document(saved),
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="The specified resume PDF was not found.",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PyMongoError:
        logger.exception("Could not save candidate")
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Check MongoDB Atlas configuration.",
        )
    except Exception:
        logger.exception("Candidate profile creation failed")
        raise HTTPException(
            status_code=500,
            detail="Candidate profile creation failed. Check backend logs.",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
