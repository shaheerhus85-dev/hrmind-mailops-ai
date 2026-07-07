from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.session import get_session_factory
from app.models import (
    Candidate,
    EmailThread,
    InterviewKit,
    ReplyDraft,
    User,
    Workspace,
    WorkspaceSettings,
)


DEMO_USER_ID = "demo_user_local"
DEMO_WORKSPACE_ID = "demo_ws_local"


CANDIDATE_DATA = [
    {
        "id": "candidate_ayesha",
        "name": "Ayesha Khan",
        "email": "ayesha@example.demo",
        "role": "Senior React Engineer",
        "source": "CV Applications",
        "match_score": 94,
        "recommendation": "shortlist suggestion",
        "next_step": "Recruiter should verify compensation expectations before screening.",
        "matched_skills": ["React", "TypeScript", "Dashboards"],
        "missing_skills": ["GraphQL"],
        "risk_note": "Compensation expectations need recruiter review.",
    },
    {
        "id": "candidate_omar",
        "name": "Omar Siddiqui",
        "email": "omar@example.demo",
        "role": "Talent Acquisition Lead",
        "source": "Client Requirements",
        "match_score": 89,
        "recommendation": "needs recruiter review",
        "next_step": "Clarify team size, reporting structure, and HRIS exposure.",
        "matched_skills": ["Tech hiring", "Leadership", "Agency ops"],
        "missing_skills": ["HRIS detail"],
        "risk_note": "Client requirement has one open ambiguity.",
    },
    {
        "id": "candidate_mina",
        "name": "Mina Roberts",
        "email": "mina@example.demo",
        "role": "People Operations Manager",
        "source": "HR Policy Questions",
        "match_score": 84,
        "recommendation": "human review required",
        "next_step": "Review policy wording before any candidate communication.",
        "matched_skills": ["Policy ops", "People process", "Documentation"],
        "missing_skills": ["Payroll systems"],
        "risk_note": "Policy-related response should stay under human review.",
    },
    {
        "id": "candidate_hassan",
        "name": "Hassan Ali",
        "email": "hassan@example.demo",
        "role": "Backend Engineer",
        "source": "Candidate Follow-ups",
        "match_score": 78,
        "recommendation": "draft only",
        "next_step": "Recruiter should verify the interview timeline and benefits response.",
        "matched_skills": ["Node.js", "APIs", "PostgreSQL"],
        "missing_skills": ["Kubernetes"],
        "risk_note": "Candidate asked about timeline and benefits.",
    },
    {
        "id": "candidate_sara",
        "name": "Sara Ahmed",
        "email": "sara@example.demo",
        "role": "Customer Success Manager",
        "source": "Offers / Salary",
        "match_score": 73,
        "recommendation": "human review required",
        "next_step": "Keep all compensation language under recruiter approval.",
        "matched_skills": ["Enterprise CS", "Renewals", "Negotiation"],
        "missing_skills": ["SaaS migration"],
        "risk_note": "Offer discussion contains compensation details.",
    },
]


EMAIL_DATA = [
    ("email_ayesha", "Ayesha Khan", "ayesha@example.demo", "Application — Senior React Engineer", "CV Application", "High", 96, "I’m sharing my updated CV and recent product dashboard work...", True, "Ayesha_Khan_CV.pdf"),
    ("email_omar", "Omar Siddiqui", "omar@example.demo", "Re: Talent acquisition leadership role", "Client Requirement", "Medium", 88, "Could you clarify the team size and reporting structure?", True, "Role_Brief.pdf"),
    ("email_mina", "Mina Roberts", "mina@example.demo", "Question about benefits policy", "HR Policy", "High", 92, "Before the next stage, I wanted to understand the policy...", False, None),
    ("email_hassan", "Hassan Ali", "hassan@example.demo", "Following up after technical interview", "Candidate Follow-up", "Medium", 94, "Thank you for the conversation. Is there an updated timeline?", False, None),
    ("email_sara", "Sara Ahmed", "sara@example.demo", "Offer package follow-up", "Offers / Salary", "High", 98, "Thank you for the offer. I’d like to discuss the package...", True, "Offer_Summary.pdf"),
]


DRAFT_DATA = [
    ("draft_ayesha", "candidate_ayesha", "Shortlist confirmation", "Shortlist", "Ayesha", "Your experience aligns well with the Senior React Engineer role, and we would like to arrange a recruiter screening conversation."),
    ("draft_omar", "candidate_omar", "Additional information request", "Need more information", "Omar", "Could you share more detail on the size of teams you have led and your recent HRIS exposure?"),
    ("draft_hassan", "candidate_hassan", "Technical interview invitation", "Interview invitation", "Hassan", "We would like to invite you to the next technical interview stage. Please review the proposed time and let us know if an adjustment is needed."),
    ("draft_mina", "candidate_mina", "Post-interview follow-up", "Follow-up", "Mina", "The team is reviewing interview feedback, and we will share a verified update shortly."),
    ("draft_sara", "candidate_sara", "Application outcome", "Polite rejection", "Sara", "Thank you for the time and care you invested in the process. After review, we will not be progressing with this opportunity."),
]


def draft_variants(first_name: str, message: str) -> tuple[str, str, str]:
    short = f"Hi {first_name},\n\n{message}\n\nBest,\nRecruitment Team"
    warm = (
        f"Hi {first_name},\n\nThank you for staying engaged with our hiring process. "
        f"{message}\n\nWe appreciate the time you have invested and are happy to "
        "clarify any questions about the next step.\n\nWarm regards,\nRecruitment Team"
    )
    policy = (
        f"Hi {first_name},\n\n{message}\n\nThis draft is prepared for recruiter "
        "review. No policy source is indexed and no message is sent automatically."
        "\n\nKind regards,\nRecruitment Team"
    )
    return short, warm, policy


def seed_demo(db: Session) -> None:
    if db.get(Workspace, DEMO_WORKSPACE_ID) is not None:
        print("Demo workspace already exists; no seed changes were made.")
        return

    demo_user = User(
        id=DEMO_USER_ID,
        email="demo@hrmind.local",
        name="Demo Recruiter",
        role="recruiter",
        is_verified=True,
    )
    workspace = Workspace(
        id=DEMO_WORKSPACE_ID,
        owner_user_id=DEMO_USER_ID,
        name="Demo Recruiting Workspace",
        mode="demo",
    )
    settings = WorkspaceSettings(
        id="demo_settings",
        workspace_id=DEMO_WORKSPACE_ID,
        demo_mode=True,
        human_review_required=True,
        draft_only=True,
        no_auto_send=True,
        no_message_deletion=True,
    )
    db.add_all([demo_user, workspace, settings])

    candidates = [
        Candidate(workspace_id=DEMO_WORKSPACE_ID, **item)
        for item in CANDIDATE_DATA
    ]
    db.add_all(candidates)

    received_at = datetime(2026, 7, 6, 9, 42, tzinfo=timezone.utc)
    db.add_all(
        [
            EmailThread(
                id=item[0],
                workspace_id=DEMO_WORKSPACE_ID,
                sender_name=item[1],
                sender_email=item[2],
                subject=item[3],
                category=item[4],
                priority=item[5],
                confidence=item[6],
                body_preview=item[7],
                received_at=received_at,
                status="pending",
                has_attachment=item[8],
                attachment_name=item[9],
            )
            for item in EMAIL_DATA
        ]
    )

    db.add_all(
        [
            ReplyDraft(
                id=draft_id,
                workspace_id=DEMO_WORKSPACE_ID,
                candidate_id=candidate_id,
                title=title,
                purpose=purpose,
                selected_variant="short",
                variant_short=draft_variants(first_name, message)[0],
                variant_warm=draft_variants(first_name, message)[1],
                variant_policy=draft_variants(first_name, message)[2],
                status="draft",
                requires_human_review=True,
            )
            for draft_id, candidate_id, title, purpose, first_name, message in DRAFT_DATA
        ]
    )

    technical = [
        "How would you structure complex dashboard state?",
        "Describe a migration or systems improvement you led.",
    ]
    behavioral = [
        "Tell us about a difficult product or hiring tradeoff.",
        "How do you communicate risk to stakeholders?",
    ]
    role_fit = [
        "What ownership model helps you do your best work?",
        "How do you partner with cross-functional teams?",
    ]
    db.add_all(
        [
            InterviewKit(
                id=f"kit_{candidate.id}",
                workspace_id=DEMO_WORKSPACE_ID,
                candidate_id=candidate.id,
                title=f"Interview Kit — {candidate.name}",
                technical_questions=technical,
                behavioral_questions=behavioral,
                role_fit_questions=role_fit,
                red_flags=["Listen for vague ownership claims.", candidate.risk_note],
                what_to_listen_for=[
                    "Clear ownership and specific tradeoffs.",
                    "Evidence behind the strongest matched skills.",
                ],
                status="ready",
            )
            for candidate in candidates
        ]
    )

    db.commit()
    print("Demo workspace and local-safe sample data were seeded.")


def main() -> None:
    with get_session_factory()() as db:
        seed_demo(db)


if __name__ == "__main__":
    main()
