/**
 * Gemini AI Service
 * 
 * Handles communication with Google's Gemini API for generating
 * AI-powered productivity summaries. Uses native fetch (Node 18+)
 * to avoid adding axios as a dependency.
 * 
 * Architecture Decision:
 * - Isolated service layer keeps AI logic separate from route handlers
 * - Structured prompt engineering ensures consistent, professional output
 * - Graceful degradation if API key is missing or API is unreachable
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Build a structured prompt from analytics data for the Gemini model.
 * The prompt is designed to produce concise, actionable productivity insights.
 */
function buildProductivityPrompt(analytics) {
  return `You are a professional project management analyst. Analyze the following team productivity data and provide a concise summary (max 200 words).

DATA:
- Total Tasks: ${analytics.totalTasks || 0}
- Completed Tasks: ${analytics.completedTasks || 0}
- Overdue Tasks: ${analytics.overdueTasks || 0}
- In-Progress Tasks: ${analytics.inProgressTasks || 0}
- Completion Rate: ${analytics.completionPercentage || 0}%
- Active Projects: ${analytics.activeProjects || 0}
- Tasks Completed Today: ${analytics.completedToday || 0}

Provide your analysis covering:
1. **Bottlenecks**: Identify potential blockers based on overdue and in-progress ratios
2. **Overdue Trends**: Assess urgency of overdue tasks relative to total workload
3. **Productivity Insights**: Evaluate completion rate and daily output
4. **Recommendations**: Give 2-3 actionable steps to improve team velocity

Use a professional, direct tone. Format as a brief paragraph, not bullet points.`;
}

/**
 * Generate an AI productivity summary using Google Gemini API.
 * 
 * @param {Object} analytics - Analytics data object
 * @returns {Promise<{success: boolean, summary?: string, error?: string}>}
 */
async function generateProductivitySummary(analytics) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY is not configured. Set it in environment variables.'
    };
  }

  try {
    const prompt = buildProductivityPrompt(analytics);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
          topP: 0.9
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);
      return {
        success: false,
        error: `Gemini API returned ${response.status}: ${errorData?.error?.message || 'Unknown error'}`
      };
    }

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      return { success: false, error: 'Gemini API returned an empty response' };
    }

    return { success: true, summary: summary.trim() };
  } catch (err) {
    console.error('Gemini service error:', err.message);
    return {
      success: false,
      error: `Failed to connect to Gemini API: ${err.message}`
    };
  }
}

module.exports = { generateProductivitySummary };
