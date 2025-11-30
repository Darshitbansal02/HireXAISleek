"""
Inspect and Delete Specific Shortlist Entry

This script helps you view and delete the shortlist entry causing the phantom "General Opportunity" card.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from core.database import get_db
from models.shortlisted_candidate import ShortlistedCandidate
from models.user import User
from models.job import Job
from models.candidate_profile import CandidateProfile
from models.scheduled_event import ScheduledEvent
from models.notification import Notification

def inspect_and_cleanup():
    db = next(get_db())
    
    # Get the problematic shortlist entry (id=3 from logs)
    shortlist = db.query(ShortlistedCandidate).filter(ShortlistedCandidate.id == 6).first()
    
    if not shortlist:
        print("✓ Shortlist entry id=3 not found (already deleted)")
        return
    
    print("=" * 60)
    print("SHORTLIST ENTRY DETAILS")
    print("=" * 60)
    print(f"ID: {shortlist.id}")
    print(f"Recruiter ID: {shortlist.recruiter_id}")
    print(f"Candidate Profile ID: {shortlist.candidate_id}")
    print(f"Job ID: {shortlist.job_id}")
    print(f"Created At: {shortlist.created_at}")
    
    # Get recruiter details
    recruiter = db.query(User).filter(User.id == shortlist.recruiter_id).first()
    if recruiter:
        print(f"\nRecruiter: {recruiter.full_name} ({recruiter.email})")
    else:
        print("\nRecruiter: NOT FOUND")
    
    # Get candidate details
    candidate_profile = db.query(CandidateProfile).filter(CandidateProfile.id == shortlist.candidate_id).first()
    if candidate_profile:
        candidate_user = db.query(User).filter(User.id == candidate_profile.user_id).first()
        if candidate_user:
            print(f"Candidate: {candidate_user.full_name} ({candidate_user.email})")
    else:
        print("Candidate: NOT FOUND")
    
    # Check for associated events
    events = db.query(ScheduledEvent).filter(
        ScheduledEvent.candidate_id == shortlist.candidate_id,
        ScheduledEvent.recruiter_id == shortlist.recruiter_id,
        ScheduledEvent.job_id == None
    ).all()
    
    if events:
        print(f"\nAssociated Events: {len(events)}")
        for event in events:
            print(f"  - Event ID {event.id}: {event.event_type} at {event.scheduled_at}")
    
    print("\n" + "=" * 60)
    
    # Ask for confirmation
    print("\nThis entry is causing the 'General Opportunity' card to appear.")
    response = input("Do you want to DELETE this shortlist entry? (yes/no): ").strip().lower()
    
    if response == 'yes':
        # Delete associated events if user confirms
        if events:
            delete_events = input(f"Also delete {len(events)} associated event(s)? (yes/no): ").strip().lower()
            if delete_events == 'yes':
                for event in events:
                    db.delete(event)
                print(f"✓ Deleted {len(events)} event(s)")
        
        db.delete(shortlist)
        db.commit()
        print("✓ Deleted shortlist entry id=4")
        print("\nReload your candidate dashboard - the 'General Opportunity' card should be gone!")
    else:
        print("Cancelled. No changes made.")

if __name__ == "__main__":
    inspect_and_cleanup()
