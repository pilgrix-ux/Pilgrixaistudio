/**
 * Processing and job service.
 *
 * Long-running operations are represented as queued jobs, not instant success.
 */

import { config } from '@/lib/config'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse, CreateJobRequest, ProcessingJob } from '@/types'

const jobs = new Map<string, ProcessingJob>()

export const jobService = {
  async createJob(request: CreateJobRequest): Promise<ApiResponse<ProcessingJob>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<ProcessingJob>('/api/jobs', {
        method: 'POST',
        body: request,
      })
    }

    const job: ProcessingJob = {
      jobId: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: request.projectId,
      operation: request.operation,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: request.metadata ?? {},
    }

    jobs.set(job.jobId, job)

    return {
      ok: true,
      data: job,
      requestId: `local-job-create-${job.jobId}`,
      timestamp: new Date().toISOString(),
    }
  },

  async getJob(jobId: string): Promise<ApiResponse<ProcessingJob | null>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<ProcessingJob | null>(`/api/jobs/${jobId}`)
    }

    return {
      ok: true,
      data: jobs.get(jobId) ?? null,
      requestId: `local-job-get-${jobId}`,
      timestamp: new Date().toISOString(),
    }
  },

  async pollJob(jobId: string): Promise<ApiResponse<ProcessingJob | null>> {
    const existing = jobs.get(jobId)

    if (!existing) {
      return {
        ok: false,
        error: {
          code: 'not_found',
          message: `Job ${jobId} was not found`,
          userMessage: 'The job could not be found.',
          status: 404,
          requestId: `local-job-poll-${jobId}`,
          retryable: false,
        },
        requestId: `local-job-poll-${jobId}`,
        timestamp: new Date().toISOString(),
      }
    }

    const nextProgress = Math.min(existing.progress + 25, 100)
    const nextStatus: ProcessingJob['status'] =
      nextProgress >= 100 ? 'completed' : 'processing'

    const updated: ProcessingJob = {
      ...existing,
      status: nextStatus,
      progress: nextProgress,
      updatedAt: new Date().toISOString(),
      resultReference: nextStatus === 'completed' ? `result-${jobId}` : undefined,
    }

    jobs.set(jobId, updated)

    return {
      ok: true,
      data: updated,
      requestId: `local-job-poll-${jobId}`,
      timestamp: new Date().toISOString(),
    }
  },

  async cancelJob(jobId: string): Promise<ApiResponse<ProcessingJob | null>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<ProcessingJob | null>(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
      })
    }

    const existing = jobs.get(jobId)
    if (!existing) {
      return {
        ok: false,
        error: {
          code: 'not_found',
          message: `Job ${jobId} not found`,
          userMessage: 'The processing job could not be found.',
          status: 404,
          requestId: `local-job-cancel-${jobId}`,
          retryable: false,
        },
        requestId: `local-job-cancel-${jobId}`,
        timestamp: new Date().toISOString(),
      }
    }

    const cancelled: ProcessingJob = {
      ...existing,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    }
    jobs.set(jobId, cancelled)

    return {
      ok: true,
      data: cancelled,
      requestId: `local-job-cancel-${jobId}`,
      timestamp: new Date().toISOString(),
    }
  },
}
