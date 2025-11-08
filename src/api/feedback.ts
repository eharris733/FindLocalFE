import { supabase } from '../supabase';
import { logger } from '../utils/logger';

export type FeedbackType = 'bug' | 'feature' | 'general';

export interface SubmitFeedbackParams {
  email: string | null;
  feedbackType: FeedbackType;
  feedbackText: string;
  isAnonymous: boolean;
}

/**
 * Submit user feedback to the database
 */
export async function submitFeedback({
  email,
  feedbackType,
  feedbackText,
  isAnonymous,
}: SubmitFeedbackParams) {
  try {
    logger.info('Submitting feedback:', { feedbackType, isAnonymous, hasEmail: !!email });

    const { data, error } = await supabase
      .from('user_feedback')
      .insert([
        {
          email: isAnonymous ? null : email,
          feedback_type: feedbackType,
          feedback_text: feedbackText,
          is_anonymous: isAnonymous,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error('Error submitting feedback:', error);
      return { success: false, error };
    }

    logger.info('Feedback submitted successfully:', data.id);
    return { success: true, data };
  } catch (err) {
    logger.error('Exception submitting feedback:', err);
    return { success: false, error: err };
  }
}
