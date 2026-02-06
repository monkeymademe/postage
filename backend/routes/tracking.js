import express from 'express';
import { TrackingUrl } from '../models/TrackingUrl.js';

const router = express.Router();

// Public route - no authentication required
// Redirect and track clicks
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Find tracking URL
    const trackingUrl = await TrackingUrl.findByShortCode(code);
    
    if (!trackingUrl) {
      return res.status(404).send('Tracking URL not found');
    }

    // Record click
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referer = req.headers.referer || req.headers.referrer || 'direct';

    await TrackingUrl.recordClick(trackingUrl.id, ipAddress, userAgent, referer);

    // Redirect to original URL
    res.redirect(302, trackingUrl.original_url);
  } catch (error) {
    console.error('Tracking redirect error:', error);
    res.status(500).send('Error processing redirect');
  }
});

export default router;
