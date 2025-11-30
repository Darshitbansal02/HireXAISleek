"""
Database Cleanup Script for Orphaned Shortlist Entries

This script helps identify and remove orphaned entries from the shortlisted_candidates table.
Run this if you see phantom "General Opportunity" cards in the Application Tracker.

Usage:
1. Activate your virtual environment
2. Run: python backend/cleanup_shortlists.py --dry-run (to see what would be deleted)
3. Run: python backend/cleanup_shortlists.py (to actually delete)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from core.database import get_db
from models.shortlisted_candidate import ShortlistedCandidate
from models.user import User
from models.job import Job
from models.candidate_profile import CandidateProfile
from models.notification import Notification  # Import to resolve User relationship
from models.scheduled_event import ScheduledEvent  # Import to avoid issues

def cleanup_orphaned_shortlists(dry_run=True):
    db = next(get_db())
    
    all_shortlists = db.query(ShortlistedCandidate).all()
    print(f"Found {len(all_shortlists)} total shortlist entries")
    
    to_delete = []
    
    for item in all_shortlists:
        reasons = []
        
        # Check if recruiter exists
        recruiter = db.query(User).filter(User.id == item.recruiter_id).first()
        if not recruiter:
            reasons.append(f"Recruiter {item.recruiter_id} not found")
        
        # Check if candidate profile exists
        candidate = db.query(CandidateProfile).filter(CandidateProfile.id == item.candidate_id).first()
        if not candidate:
            reasons.append(f"Candidate profile {item.candidate_id} not found")
        
        # Check if job exists (if job_id is set)
        if item.job_id:
            job = db.query(Job).filter(Job.id == item.job_id).first()
            if not job:
                reasons.append(f"Job {item.job_id} not found")
        
        if reasons:
            print(f"Orphaned entry: id={item.id}, recruiter={item.recruiter_id}, candidate={item.candidate_id}, job={item.job_id}")
            print(f"  Reasons: {', '.join(reasons)}")
            to_delete.append(item)
    
    print(f"\nFound {len(to_delete)} orphaned entries")
    
    if to_delete:
        if dry_run:
            print("\n[DRY RUN] Would delete these entries. Run without --dry-run to actually delete.")
        else:
            for item in to_delete:
                db.delete(item)
            db.commit()
            print(f"\n✓ Deleted {len(to_delete)} orphaned entries")
    else:
        print("\n✓ No orphaned entries found")

if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    cleanup_orphaned_shortlists(dry_run)
