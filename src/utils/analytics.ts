import { supabase } from '../supabase';
import { logger } from './logger';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  eventType: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

interface EventMetric {
  eventId: string;
  metricType: 'view' | 'click' | 'favorite' | 'unfavorite' | 'share' | 'modal_open' | 'modal_close' | 'calendar_export';
  city?: string;
  durationMs?: number;
  source?: 'list' | 'map' | 'gallery' | 'search';
  metadata?: Record<string, any>;
}

interface VenueMetric {
  venueId: string;
  metricType: 'view' | 'click' | 'modal_open' | 'modal_close' | 'website_click' | 'directions_click';
  city?: string;
  durationMs?: number;
  source?: 'map' | 'event_modal' | 'list';
  metadata?: Record<string, any>;
}

interface FilterUsage {
  filterType: 'time_range' | 'category' | 'region' | 'price' | 'search';
  filterValue: string;
  applied: boolean;
  resultsCount?: number;
  city?: string;
  metadata?: Record<string, any>;
}

interface SessionUpdate {
  pageViews?: number;
  eventsViewed?: number;
  venuesViewed?: number;
  favoritesAdded?: number;
  filtersChanged?: number;
  citiesVisited?: string[];
  communitiesSelected?: string[];
  finalCity?: string;
}

class AnalyticsService {
  private sessionId: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 5000; // Flush every 5 seconds
  private readonly MAX_QUEUE_SIZE = 50;
  private sessionStartTime: number | null = null;
  private lastActivityTime: number | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private currentCity: string | null = null;
  private viewedCities: Set<string> = new Set();
  private selectedCommunities: Set<string> = new Set();
  private optInChecked: boolean = false;
  private analyticsEnabled: boolean = true;

  async initialize() {
    // Generate or retrieve session ID
    this.sessionId = await this.getOrCreateSessionId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    
    // Check user consent
    await this.checkAnalyticsConsent();
    
    if (!this.analyticsEnabled) {
      logger.info('Analytics disabled by user preference');
      return;
    }
    
    // Create session record
    await this.createSession();
    
    // Start auto-flush
    this.startAutoFlush();
    
    // Start activity monitoring
    this.startActivityMonitoring();
    
    logger.info('Analytics initialized', { sessionId: this.sessionId });
  }

  private async checkAnalyticsConsent() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('analytics_opt_in')
          .eq('id', user.id)
          .single();
        
        if (profile?.analytics_opt_in === false) {
          this.analyticsEnabled = false;
        }
      }
      this.optInChecked = true;
    } catch (error) {
      logger.error('Error checking analytics consent:', error);
      // Default to enabled if we can't check
      this.analyticsEnabled = true;
      this.optInChecked = true;
    }
  }

  private async getOrCreateSessionId(): Promise<string> {
    try {
      let sessionId = await AsyncStorage.getItem('@findlocal/analytics_session_id');
      const sessionTimestamp = await AsyncStorage.getItem('@findlocal/analytics_session_timestamp');
      
      // Create new session if none exists or if last session was > 30 min ago
      const now = Date.now();
      if (!sessionId || !sessionTimestamp || (now - parseInt(sessionTimestamp)) > this.INACTIVITY_TIMEOUT) {
        sessionId = `${now}-${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('@findlocal/analytics_session_id', sessionId);
        await AsyncStorage.setItem('@findlocal/analytics_session_timestamp', now.toString());
      }
      
      return sessionId;
    } catch (error) {
      logger.error('Error getting session ID:', error);
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  private async createSession() {
    if (!this.analyticsEnabled) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use upsert to handle case where session already exists (e.g., after reload)
      const { error } = await supabase
        .from('session_metrics')
        .upsert({
          session_id: this.sessionId,
          user_id: user?.id || null,
          platform: Platform.OS,
          initial_city: this.currentCity,
          device_info: {
            deviceName: Device.deviceName,
            osVersion: Device.osVersion,
            modelName: Device.modelName,
            brand: Device.brand,
          },
        }, {
          onConflict: 'session_id',
          ignoreDuplicates: false, // Update if exists
        });

      if (error) {
        logger.error('Error creating session:', error);
      }
    } catch (error) {
      logger.error('Error in createSession:', error);
    }
  }

  private async updateSession(updates: SessionUpdate) {
    if (!this.analyticsEnabled) return;
    if (!this.sessionId) {
      logger.warn('updateSession called before session initialized');
      return;
    }

    try {
      const updateData: any = { last_activity: new Date().toISOString() };
      
      if (updates.pageViews) {
        updateData.page_views = updates.pageViews;
      }
      if (updates.eventsViewed) {
        updateData.events_viewed = updates.eventsViewed;
      }
      if (updates.venuesViewed) {
        updateData.venues_viewed = updates.venuesViewed;
      }
      if (updates.favoritesAdded) {
        updateData.favorites_added = updates.favoritesAdded;
      }
      if (updates.filtersChanged) {
        updateData.filters_changed = updates.filtersChanged;
      }
      if (updates.citiesVisited) {
        updateData.cities_visited = updates.citiesVisited;
      }
      if (updates.communitiesSelected) {
        updateData.communities_selected = updates.communitiesSelected;
      }
      if (updates.finalCity) {
        updateData.final_city = updates.finalCity;
      }

      const { error } = await supabase
        .from('session_metrics')
        .update(updateData)
        .eq('session_id', this.sessionId);

      if (error) {
        logger.error('Error updating session:', error);
      }
    } catch (error) {
      logger.error('Error in updateSession:', error);
    }
  }

  private startAutoFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  private startActivityMonitoring() {
    this.activityCheckInterval = setInterval(async () => {
      const now = Date.now();
      if (this.lastActivityTime && (now - this.lastActivityTime) > this.INACTIVITY_TIMEOUT) {
        // Session timed out
        await this.endSession();
        // Create new session
        this.sessionId = await this.getOrCreateSessionId();
        this.sessionStartTime = now;
        this.lastActivityTime = now;
        await this.createSession();
      }
    }, 60000); // Check every minute
  }

  private recordActivity() {
    this.lastActivityTime = Date.now();
    // Update timestamp in AsyncStorage
    AsyncStorage.setItem('@findlocal/analytics_session_timestamp', this.lastActivityTime.toString()).catch(() => {});
  }

  private async flush() {
    if (this.eventQueue.length === 0 || !this.analyticsEnabled) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const analyticsData = eventsToSend.map(event => ({
        user_id: user?.id || null,
        session_id: event.sessionId || this.sessionId,
        event_type: event.eventType,
        page_path: event.properties?.pagePath || null,
        city: event.properties?.city || null,
        filters_applied: event.properties?.filters || null,
        communities_selected: event.properties?.communities || null,
        view_mode: event.properties?.viewMode || null,
        search_query: event.properties?.searchQuery || null,
        results_count: event.properties?.resultsCount || null,
        metadata: {
          ...event.properties,
          platform: Platform.OS,
          deviceName: Device.deviceName,
          osVersion: Device.osVersion,
        },
      }));

      const { error } = await supabase
        .from('user_analytics')
        .insert(analyticsData);

      if (error) {
        logger.error('Error flushing analytics:', error);
        // Re-queue failed events
        this.eventQueue.unshift(...eventsToSend);
      }
    } catch (error) {
      logger.error('Error in analytics flush:', error);
    }
  }

  /**
   * Track a user action or page view
   */
  async track(eventType: string, properties?: Record<string, any>) {
    if (!this.analyticsEnabled && this.optInChecked) return;

    this.recordActivity();

    const event: AnalyticsEvent = {
      eventType,
      properties,
      sessionId: this.sessionId || undefined,
    };

    this.eventQueue.push(event);

    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      await this.flush();
    }

    logger.debug('Analytics tracked:', eventType, properties);
  }

  /**
   * Track event-specific metrics
   */
  async trackEventMetric({ eventId, metricType, city, durationMs, source, metadata }: EventMetric) {
    if (!this.analyticsEnabled && this.optInChecked) return;

    this.recordActivity();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('event_metrics')
        .insert({
          event_id: eventId,
          metric_type: metricType,
          user_id: user?.id || null,
          session_id: this.sessionId,
          city,
          duration_ms: durationMs,
          source,
          metadata,
        });

      if (error) {
        logger.error('Error tracking event metric:', error);
      }

      // Update session metrics (only if session is initialized)
      if (!this.sessionId) {
        logger.warn('trackEventMetric called before session initialized');
        return;
      }

      if (metricType === 'view' || metricType === 'modal_open') {
        const { data } = await supabase
          .from('session_metrics')
          .select('events_viewed')
          .eq('session_id', this.sessionId)
          .single();
        
        await this.updateSession({ eventsViewed: (data?.events_viewed || 0) + 1 });
      }

      if (metricType === 'favorite') {
        const { data } = await supabase
          .from('session_metrics')
          .select('favorites_added')
          .eq('session_id', this.sessionId)
          .single();
        
        await this.updateSession({ favoritesAdded: (data?.favorites_added || 0) + 1 });
      }
    } catch (error) {
      logger.error('Error in trackEventMetric:', error);
    }
  }

  /**
   * Track venue-specific metrics
   */
  async trackVenueMetric({ venueId, metricType, city, durationMs, source, metadata }: VenueMetric) {
    if (!this.analyticsEnabled && this.optInChecked) return;

    this.recordActivity();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('venue_metrics')
        .insert({
          venue_id: venueId,
          metric_type: metricType,
          user_id: user?.id || null,
          session_id: this.sessionId,
          city,
          duration_ms: durationMs,
          source,
          metadata,
        });

      if (error) {
        logger.error('Error tracking venue metric:', error);
      }

      // Update session metrics (only if session is initialized)
      if (!this.sessionId) {
        logger.warn('trackVenueMetric called before session initialized');
        return;
      }

      if (metricType === 'modal_open') {
        const { data } = await supabase
          .from('session_metrics')
          .select('venues_viewed')
          .eq('session_id', this.sessionId)
          .single();
        
        await this.updateSession({ venuesViewed: (data?.venues_viewed || 0) + 1 });
      }
    } catch (error) {
      logger.error('Error in trackVenueMetric:', error);
    }
  }

  /**
   * Track filter usage
   */
  async trackFilterUsage({ filterType, filterValue, applied, resultsCount, city, metadata }: FilterUsage) {
    if (!this.analyticsEnabled && this.optInChecked) return;

    this.recordActivity();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('filter_usage')
        .insert({
          session_id: this.sessionId,
          user_id: user?.id || null,
          city,
          filter_type: filterType,
          filter_value: filterValue,
          applied,
          results_count: resultsCount,
          metadata,
        });

      if (error) {
        logger.error('Error tracking filter usage:', error);
      }

      // Update session metrics
      if (applied) {
        const { data } = await supabase
          .from('session_metrics')
          .select('filters_changed')
          .eq('session_id', this.sessionId)
          .single();
        
        await this.updateSession({ filtersChanged: (data?.filters_changed || 0) + 1 });
      }
    } catch (error) {
      logger.error('Error in trackFilterUsage:', error);
    }
  }

  /**
   * Track page views
   */
  async trackPageView(pagePath: string, properties?: Record<string, any>) {
    await this.track('page_view', {
      pagePath,
      ...properties,
    });

    // Update session page view count (only if session is initialized)
    if (!this.sessionId) {
      logger.warn('trackPageView called before session initialized');
      return;
    }

    const { data } = await supabase
      .from('session_metrics')
      .select('page_views')
      .eq('session_id', this.sessionId)
      .single();
    
    await this.updateSession({ pageViews: (data?.page_views || 0) + 1 });
  }

  /**
   * Track filter changes
   */
  async trackFilterChange(filters: Record<string, any>, city?: string, resultsCount?: number) {
    await this.track('filter_change', {
      filters,
      city,
      resultsCount,
    });

    // Track individual filter applications
    for (const [filterType, filterValue] of Object.entries(filters)) {
      if (filterValue && filterType !== 'searchQuery') {
        const values = Array.isArray(filterValue) ? filterValue : [filterValue];
        for (const value of values) {
          if (value) {
            await this.trackFilterUsage({
              filterType: filterType as any,
              filterValue: String(value),
              applied: true,
              resultsCount,
              city,
            });
          }
        }
      }
    }
  }

  /**
   * Track community/region selections
   */
  async trackCommunitySelection(communities: string[], city?: string) {
    if (!this.analyticsEnabled && this.optInChecked) return;

    communities.forEach(c => this.selectedCommunities.add(c));

    await this.track('community_select', {
      communities,
      city,
    });

    // Update session
    await this.updateSession({ 
      communitiesSelected: Array.from(this.selectedCommunities) 
    });
  }

  /**
   * Track city changes
   */
  async trackCityChange(newCity: string, previousCity?: string) {
    if (!this.analyticsEnabled && this.optInChecked) return;

    this.currentCity = newCity;
    this.viewedCities.add(newCity);

    await this.track('city_change', {
      newCity,
      previousCity,
    });

    // Update session
    await this.updateSession({ 
      citiesVisited: Array.from(this.viewedCities),
      finalCity: newCity,
    });
  }

  /**
   * Track view mode changes
   */
  async trackViewModeChange(viewMode: 'list' | 'gallery' | 'map', city?: string) {
    await this.track('view_mode_change', {
      viewMode,
      city,
    });
  }

  /**
   * Track search queries
   */
  async trackSearch(query: string, resultsCount: number, city?: string) {
    await this.track('search', {
      searchQuery: query,
      resultsCount,
      city,
    });

    // Also track as filter usage
    await this.trackFilterUsage({
      filterType: 'search',
      filterValue: query,
      applied: true,
      resultsCount,
      city,
    });
  }

  /**
   * Track errors
   */
  async trackError(error: Error, context?: Record<string, any>) {
    // Always track errors, even if analytics is disabled
    await this.track('error', {
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    });
  }

  /**
   * End the current session
   */
  async endSession() {
    if (!this.sessionId) return;

    const duration = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;

    try {
      await this.flush();

      await supabase
        .from('session_metrics')
        .update({
          end_time: new Date().toISOString(),
          duration_ms: duration,
          final_city: this.currentCity,
        })
        .eq('session_id', this.sessionId);

      logger.info('Session ended', { sessionId: this.sessionId, duration });
    } catch (error) {
      logger.error('Error ending session:', error);
    }
  }

  /**
   * Update analytics consent
   */
  async updateConsent(enabled: boolean) {
    this.analyticsEnabled = enabled;
    this.optInChecked = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ analytics_opt_in: enabled })
          .eq('id', user.id);
      }
    } catch (error) {
      logger.error('Error updating analytics consent:', error);
    }
  }

  /**
   * Clean up on app close
   */
  async cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }
    await this.endSession();
  }
}

export const analytics = new AnalyticsService();
