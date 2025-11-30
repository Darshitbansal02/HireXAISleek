"""
Diagnostic Script: Show ALL Shortlist Entries

This script displays ALL shortlist entries in the database to help debug
the "General Opportunity" card issue.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from core.database import get_db
from models.shortlisted_candidate import ShortlistedCandidate
from models.user import User
from models.job import Job
from models.candidate_profile import CandidateProfile
from models.notification import Notification
from models.scheduled_event import ScheduledEvent

def show_all_shortlists():
    db = next(get_db())
    
    all_shortlists = db.query(ShortlistedCandidate).all()
    
    print("=" * 80)
    print(f"TOTAL SHORTLIST ENTRIES IN DATABASE: {len(all_shortlists)}")
    print("=" * 80)
    
    if not all_shortlists:
        print("\n✓ No shortlist entries found in database")
        return
    
    for item in all_shortlists:
        print(f"\nShortlist Entry #{item.id}:")
        print(f"  Recruiter ID: {item.recruiter_id}")
        print(f"  Candidate Profile ID: {item.candidate_id}")
        print(f"  Job ID: {item.job_id or 'None (General Shortlist)'}")
        print(f"  Created At: {item.created_at}")
        
        # Get recruiter details
        recruiter = db.query(User).filter(User.id == item.recruiter_id).first()
        if recruiter:
            print(f"  Recruiter: {recruiter.full_name} ({recruiter.email})")
        else:
            print(f"  Recruiter: [DELETED]")
        
        # Get candidate details
        candidate_profile = db.query(CandidateProfile).filter(CandidateProfile.id == item.candidate_id).first()
        if candidate_profile:
            candidate_user = db.query(User).filter(User.id == candidate_profile.user_id).first()
            if candidate_user:
                print(f"  Candidate: {candidate_user.full_name} ({candidate_user.email})")
                print(f"  Candidate User ID: {candidate_user.id}")
        else:
            print(f"  Candidate: [DELETED]")
        
        # Get job details if job_id is set
        if item.job_id:
            job = db.query(Job).filter(Job.id == item.job_id).first()
            if job:
                print(f"  Job: {job.title} at {job.company}")
            else:
                print(f"  Job: [DELETED - ID {item.job_id}]")
        
        # Check for associated events
        events = db.query(ScheduledEvent).filter(
            ScheduledEvent.candidate_id == item.candidate_id,
            ScheduledEvent.recruiter_id == item.recruiter_id
        ).all()
        
        if events:
            print(f"  Associated Events: {len(events)}")
            for event in events:
                print(f"    - Event #{event.id}: {event.event_type} at {event.scheduled_at}, job_id={event.job_id or 'None'}")
        
        print("-" * 80)
    
    print(f"\n\nSUMMARY:")
    print(f"Total Entries: {len(all_shortlists)}")
    general_count = sum(1 for item in all_shortlists if item.job_id is None)
    job_specific_count = len(all_shortlists) - general_count
    print(f"General Shortlists (job_id=None): {general_count}")
    print(f"Job-Specific Shortlists: {job_specific_count}")

if __name__ == "__main__":
    show_all_shortlists()
