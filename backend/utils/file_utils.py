import os

def save_upload_file_tmp(upload_file, destination):
    with open(destination, 'wb') as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return destination
