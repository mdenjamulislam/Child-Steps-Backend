import type { GuidelineResponse } from "../types";

/**
 * Service to interact with the AI Model to generate personalized guidelines.
 * Note: This currently uses a mock implementation returning structured JSON.
 * It simulates network latency to demonstrate loading states on the frontend.
 */

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateParentGuidelines = async (
  ageInMonths: number,
  latestWeight?: number,
  latestHeight?: number
): Promise<GuidelineResponse> => {
  // Simulate AI API call latency (1.5 seconds)
  await delay(1500);

  // In a real implementation, we would construct a prompt like:
  // const prompt = `Generate a structured JSON containing developmental guidelines for a ${ageInMonths}-month-old child...`;
  // And call the Google Antigravity AI or @google/genai SDK.

  // Return age-appropriate mock data
  if (ageInMonths < 12) {
    // Infants
    return {
      physical_activity: [
        "Encourage supervised tummy time for at least 15-30 minutes daily.",
        "Provide safe spaces for rolling and reaching for toys.",
        "Support sitting up with pillows if they are showing readiness.",
      ],
      nutrition: [
        "Focus on breast milk or infant formula as the primary nutrition source.",
        "Introduce single-ingredient purees around 6 months (if pediatrician approved).",
        "Ensure adequate iron intake after 6 months.",
      ],
      cognitive_focus: [
        "Read high-contrast board books and make expressive facial movements.",
        "Talk and sing frequently to encourage language development.",
        "Play peek-a-boo to develop object permanence.",
      ],
      sleep_recommendations: [
        "Expect 14-17 hours of sleep per 24 hours, including naps.",
        "Always place the baby on their back to sleep.",
        "Establish a consistent, calming bedtime routine (e.g., bath, book, bed).",
      ],
    };
  } else if (ageInMonths < 36) {
    // Toddlers
    return {
      physical_activity: [
        "Provide at least 60 minutes of unstructured active play daily.",
        "Encourage walking, running, and climbing in safe environments.",
        "Practice fine motor skills with stacking blocks and coloring.",
      ],
      nutrition: [
        "Offer 3 small meals and 2 healthy snacks each day.",
        "Introduce a variety of textures and colors (fruits, vegetables, proteins).",
        "Limit juice and sugary snacks; encourage water and plain milk.",
      ],
      cognitive_focus: [
        "Ask open-ended questions to encourage speech and conversation.",
        "Engage in pretend play to stimulate imagination.",
        "Read together daily and ask them to point to objects in the book.",
      ],
      sleep_recommendations: [
        "Expect 11-14 hours of sleep per 24 hours, usually with 1 nap.",
        "Maintain a strict, consistent bedtime to avoid overtiredness.",
        "Transition from a crib to a toddler bed if they are climbing out.",
      ],
    };
  } else {
    // Preschoolers and older
    return {
      physical_activity: [
        "Aim for at least 60 minutes of structured and unstructured physical activity.",
        "Teach basic sports skills like throwing, catching, and kicking a ball.",
        "Encourage independent dressing and basic self-care for motor development.",
      ],
      nutrition: [
        "Serve the same balanced meals as the rest of the family.",
        "Encourage involvement in food preparation to reduce picky eating.",
        "Ensure adequate calcium and vitamin D for growing bones.",
      ],
      cognitive_focus: [
        "Practice counting, identifying colors, and sorting shapes.",
        "Encourage socialization through playdates and group activities.",
        "Limit screen time to 1 hour of high-quality programming daily.",
      ],
      sleep_recommendations: [
        "Expect 10-13 hours of sleep per 24 hours (naps may start dropping).",
        "Create a cool, dark, and quiet sleep environment.",
        "Avoid screens at least 1 hour before bedtime.",
      ],
    };
  }
};
