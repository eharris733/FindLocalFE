import { supabase } from '../supabase';
import { logger } from '../utils/logger';

/**
 * Upload an event cover image to Supabase Storage.
 * File path convention: {userId}/{eventId}.jpg
 */
export async function uploadEventImage(
  localUri: string,
  userId: string,
  eventId: string
): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    const filePath = `${userId}/${eventId}.jpg`;

    // Fetch the image as a blob
    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      logger.error('Error uploading event image:', uploadError);
      return { publicUrl: null, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    return { publicUrl: urlData.publicUrl, error: null };
  } catch (err: any) {
    logger.error('Error in uploadEventImage:', err);
    return { publicUrl: null, error: err.message };
  }
}

/**
 * Delete an event cover image from Supabase Storage.
 */
export async function deleteEventImage(
  userId: string,
  eventId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const filePath = `${userId}/${eventId}.jpg`;

    const { error } = await supabase.storage
      .from('event-images')
      .remove([filePath]);

    if (error) {
      logger.error('Error deleting event image:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    logger.error('Error in deleteEventImage:', err);
    return { success: false, error: err.message };
  }
}
