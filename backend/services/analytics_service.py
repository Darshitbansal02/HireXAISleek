from sqlalchemy.orm import Session
from sqlalchemy import func
from models.application import Application
from models.job import Job
from models.candidate_profile import CandidateProfile
from models.saved_job import SavedJob

class AnalyticsService:
    @staticmethod
    def get_candidate_dashboard_stats(db: Session, candidate_id: int):
        """Aggregates stats for the candidate dashboard."""
        
        # Total Applications
        total_applied = db.query(Application).filter(Application.candidate_id == candidate_id).count()
        
        # Applications by Status
        status_counts = db.query(
            Application.status, func.count(Application.status)
        ).filter(
            Application.candidate_id == candidate_id
        ).group_by(Application.status).all()
        
        status_dict = {status: count for status, count in status_counts}
        
        # Profile Views
        profile = db.query(CandidateProfile).filter(CandidateProfile.id == candidate_id).first()
        views = profile.profile_views if profile else 0
        
        # Resume Score
        resume_score = profile.resume_score if profile else 0
        
        return {
            "total_applied": total_applied,
            "status_breakdown": status_dict,
            "profile_views": views,
            "resume_score": resume_score
        }

    @staticmethod
    def get_recruiter_dashboard_stats(db: Session, recruiter_id: int):
        """Aggregates stats for the recruiter dashboard."""
        
        # Total Jobs Posted
        total_jobs = db.query(Job).filter(Job.recruiter_id == recruiter_id).count()
        
        # Total Active Jobs
        active_jobs = db.query(Job).filter(
            Job.recruiter_id == recruiter_id, 
            Job.status == 'active'
        ).count()
        
        # Total Applications Received (across all jobs posted by this recruiter)
        total_applications = db.query(Application).join(Job).filter(
            Job.recruiter_id == recruiter_id
        ).count()
        
        # Total Candidates Viewed (mock logic for now, or sum of job views)
        # In a real app, we'd track unique candidate views by this recruiter.
        # For now, let's sum up views on their jobs as a proxy for "reach"
        total_views = db.query(func.sum(Job.views)).filter(
            Job.recruiter_id == recruiter_id
        ).scalar() or 0
        
        return {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "total_applications": total_applications,
            "total_views": total_views
        }

    @staticmethod
    def get_job_analytics(db: Session, job_id: int):
        """Detailed analytics for a specific job."""
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None
            
        total_applicants = db.query(Application).filter(Application.job_id == job_id).count()
        
        status_counts = db.query(
            Application.status, func.count(Application.status)
        ).filter(
            Application.job_id == job_id
        ).group_by(Application.status).all()
        
        return {
            "job_title": job.title,
            "views": job.views,
            "total_applicants": total_applicants,
            "status_breakdown": {s: c for s, c in status_counts}
        }
