"""
Queue Manager - Handles background processing for heavy operations
"""

import threading
import queue
import time
import logging
from datetime import datetime
from enum import Enum
import json

logger = logging.getLogger(__name__)

class JobStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class QueueManager:
    def __init__(self, max_workers=5):
        self.max_workers = max_workers
        self.job_queue = queue.Queue()
        self.jobs = {}  # job_id -> job_info
        self.workers = []
        self.running = False
        self.job_counter = 0
        self.lock = threading.Lock()
        
    def start(self):
        """Start the queue manager and worker threads"""
        if self.running:
            return
            
        self.running = True
        logger.info(f"Starting queue manager with {self.max_workers} workers")
        
        for i in range(self.max_workers):
            worker = threading.Thread(target=self._worker_loop, args=(i,))
            worker.daemon = True
            worker.start()
            self.workers.append(worker)
            
    def stop(self):
        """Stop the queue manager"""
        self.running = False
        logger.info("Stopping queue manager")
        
    def submit_job(self, job_type, job_data, priority=5):
        """
        Submit a job to the queue
        
        Args:
            job_type (str): Type of job (e.g., 'document_analysis', 'vectorization')
            job_data (dict): Job parameters
            priority (int): Priority (lower = higher priority)
            
        Returns:
            str: Job ID
        """
        with self.lock:
            self.job_counter += 1
            job_id = f"{job_type}_{self.job_counter}_{int(time.time())}"
            
        job_info = {
            'job_id': job_id,
            'job_type': job_type,
            'job_data': job_data,
            'priority': priority,
            'status': JobStatus.QUEUED,
            'created_at': datetime.now(),
            'started_at': None,
            'completed_at': None,
            'result': None,
            'error': None,
            'progress': 0
        }
        
        with self.lock:
            self.jobs[job_id] = job_info
            
        # Add to queue with priority
        self.job_queue.put((priority, job_id))
        
        logger.info(f"Job {job_id} submitted to queue")
        return job_id
        
    def get_job_status(self, job_id):
        """Get job status and details"""
        with self.lock:
            if job_id not in self.jobs:
                return None
            return self.jobs[job_id].copy()
            
    def cancel_job(self, job_id):
        """Cancel a queued job (cannot cancel running jobs)"""
        with self.lock:
            if job_id not in self.jobs:
                return False
                
            job = self.jobs[job_id]
            if job['status'] == JobStatus.QUEUED:
                job['status'] = JobStatus.CANCELLED
                job['completed_at'] = datetime.now()
                return True
            return False
            
    def get_queue_stats(self):
        """Get queue statistics"""
        with self.lock:
            stats = {
                'total_jobs': len(self.jobs),
                'queued': sum(1 for job in self.jobs.values() if job['status'] == JobStatus.QUEUED),
                'processing': sum(1 for job in self.jobs.values() if job['status'] == JobStatus.PROCESSING),
                'completed': sum(1 for job in self.jobs.values() if job['status'] == JobStatus.COMPLETED),
                'failed': sum(1 for job in self.jobs.values() if job['status'] == JobStatus.FAILED),
                'queue_size': self.job_queue.qsize(),
                'workers': self.max_workers,
                'running': self.running
            }
        return stats
        
    def _worker_loop(self, worker_id):
        """Worker thread main loop"""
        logger.info(f"Worker {worker_id} started")
        
        while self.running:
            try:
                # Get job from queue (with timeout)
                try:
                    priority, job_id = self.job_queue.get(timeout=1.0)
                except queue.Empty:
                    continue
                    
                # Check if job was cancelled
                with self.lock:
                    if job_id not in self.jobs:
                        continue
                    job = self.jobs[job_id]
                    if job['status'] != JobStatus.QUEUED:
                        continue
                        
                    # Mark as processing
                    job['status'] = JobStatus.PROCESSING
                    job['started_at'] = datetime.now()
                    
                logger.info(f"Worker {worker_id} processing job {job_id}")
                
                # Process the job
                try:
                    result = self._process_job(job_id, job['job_type'], job['job_data'])
                    
                    with self.lock:
                        job = self.jobs[job_id]
                        job['status'] = JobStatus.COMPLETED
                        job['completed_at'] = datetime.now()
                        job['result'] = result
                        job['progress'] = 100
                        
                    logger.info(f"Job {job_id} completed successfully")
                    
                except Exception as e:
                    with self.lock:
                        job = self.jobs[job_id]
                        job['status'] = JobStatus.FAILED
                        job['completed_at'] = datetime.now()
                        job['error'] = str(e)
                        
                    logger.error(f"Job {job_id} failed: {str(e)}")
                    
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {str(e)}")
                
        logger.info(f"Worker {worker_id} stopped")
        
    def _process_job(self, job_id, job_type, job_data):
        """Process a specific job type"""
        if job_type == 'document_analysis':
            return self._process_document_analysis(job_id, job_data)
        elif job_type == 'vectorization':
            return self._process_vectorization(job_id, job_data)
        elif job_type == 'bulk_search':
            return self._process_bulk_search(job_id, job_data)
        else:
            raise ValueError(f"Unknown job type: {job_type}")
            
    def _process_document_analysis(self, job_id, job_data):
        """Process document analysis job"""
        # Import here to avoid circular imports
        from services.analysis_service import AnalysisService
        from openai import OpenAI
        
        openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        analysis_service = AnalysisService(openai_client)
        
        # Update progress
        self._update_job_progress(job_id, 25, "Starting analysis")
        
        result = analysis_service.analyze_document(
            job_data['document_id'],
            job_data.get('analysis_type', 'general'),
            job_data.get('context', {})
        )
        
        self._update_job_progress(job_id, 100, "Analysis complete")
        return result
        
    def _process_vectorization(self, job_id, job_data):
        """Process vectorization job"""
        from services.document_service import DocumentService
        from openai import OpenAI
        
        openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        document_service = DocumentService(openai_client)
        
        self._update_job_progress(job_id, 25, "Starting upload")
        
        result = document_service.upload_and_vectorize(
            job_data.get('file_path'),
            job_data.get('file_content'),
            job_data.get('filename'),
            job_data.get('vector_store_id'),
            job_data.get('custom_attributes', {})
        )
        
        self._update_job_progress(job_id, 100, "Upload complete")
        return result
        
    def _process_bulk_search(self, job_id, job_data):
        """Process bulk search job"""
        from services.document_service import DocumentService
        from openai import OpenAI
        
        openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        document_service = DocumentService(openai_client)
        
        queries = job_data['queries']
        results = []
        
        for i, query in enumerate(queries):
            self._update_job_progress(job_id, int((i / len(queries)) * 100), f"Processing query {i+1}/{len(queries)}")
            
            result = document_service.search_documents(
                query['query'],
                query.get('document_ids', []),
                query.get('vector_store_id'),
                query.get('context', {})
            )
            results.append(result)
            
        self._update_job_progress(job_id, 100, "Bulk search complete")
        return {'results': results}
        
    def _update_job_progress(self, job_id, progress, message):
        """Update job progress"""
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]['progress'] = progress
                self.jobs[job_id]['progress_message'] = message

# Global queue manager instance
queue_manager = QueueManager(max_workers=3)

def start_queue_manager():
    """Start the queue manager on application startup"""
    queue_manager.start()