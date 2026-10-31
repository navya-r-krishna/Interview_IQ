from models.schemas import (
    JobDescription,
    CandidateProfile,
    InterviewPlan,
    QuestionItem,
    FeedbackLog,
    PlanSettings,
)

try:
    from Backend.models import (
        ExperienceLevel,
        DifficultyLevel,
        QuestionCategory,
        QuestionModel,
        GenerateInterviewRequest,
        AnswerSubmission,
    )
except ImportError:
    pass