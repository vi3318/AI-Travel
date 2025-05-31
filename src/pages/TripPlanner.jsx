import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {useAuth} from "../contexts/AuthContext" // Correct path to context
import { GoogleGenerativeAI } from '@google/generative-ai';
// Removed direct import of getFirestore, collection, addDoc from 'firebase/firestore';
// These functions (collection, addDoc) will be dynamically imported inside handleSubmit
// to ensure db is available.

// Predefined options for interests, paces, travel styles, etc.
const interests = [
  'Culture & History', 'Food & Dining', 'Nature & Outdoors', 'Shopping',
  'Nightlife', 'Art & Museums', 'Adventure', 'Relaxation',
  'Family Activities', 'Local Experiences'
];

const paces = [
  'Relaxed', 'Moderate', 'Fast-paced'
];

const travelStyles = [
  'Luxury', 'Mid-range', 'Budget', 'Backpacking', 'Road Trip'
];

const accommodationPreferences = [
  'Hotel', 'Airbnb/Vacation Rental', 'Hostel', 'Resort', 'Camping'
];

const transportationPreferences = [
  'Flights', 'Train', 'Bus', 'Rental Car', 'Walking/Biking'
];

export default function TripPlanner() {
  const navigate = useNavigate();
  // IMPORTANT: Get currentUser AND db from AuthContext
  const { currentUser, db } = useAuth(); // 'db' is now provided by AuthContext

  // State for new and existing form fields
  const [startingLocation, setStartingLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [pace, setPace] = useState(paces[0]);
  const [travelStyle, setTravelStyle] = useState(travelStyles[0]);
  const [accommodationPreference, setAccommodationPreference] = useState(accommodationPreferences[0]);
  const [transportationPreference, setTransportationPreference] = useState(transportationPreferences[0]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);

  // Effect to calculate endDate if startDate and numberOfDays are provided
  useEffect(() => {
    if (startDate && numberOfDays) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + parseInt(numberOfDays) - 1);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (startDate && endDate && !numberOfDays) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setNumberOfDays(diffDays);
    }
  }, [startDate, numberOfDays, endDate]);


  // Handler for toggling interests checkboxes
  const handleInterestToggle = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  // Generates the prompt for the Gemini API based on form inputs
  const generatePrompt = () => {
    let prompt = `Create a detailed travel itinerary for ${destination}`;

    if (startingLocation) {
      prompt += ` starting from ${startingLocation}`;
    }

    if (startDate && endDate) {
      prompt += ` from ${startDate} to ${endDate}`;
    } else if (startDate && numberOfDays) {
      prompt += ` for ${numberOfDays} days starting on ${startDate}`;
    } else {
      prompt += `. Please specify dates or number of days.`;
    }

    prompt += ` for ${travelers} person(s).`;
    if (budget) {
      prompt += ` with a budget of ${budget}.`;
    }
    if (selectedInterests.length > 0) {
      prompt += ` The traveler(s) are interested in: ${selectedInterests.join(', ')}.`;
    }
    prompt += ` Preferred pace: ${pace}.`;
    prompt += ` Travel style: ${travelStyle}.`;
    prompt += ` Accommodation preference: ${accommodationPreference}.`;
    prompt += ` Transportation preference: ${transportationPreference}.`;
    if (dietaryRestrictions) {
      prompt += ` Dietary restrictions: ${dietaryRestrictions}.`;
    }
    prompt += ` Include daily activities, recommended restaurants, estimated costs, and practical tips.`;
    return prompt;
  };

  // Handles form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!destination || (!startDate || (!endDate && !numberOfDays))) {
      setError('Please fill in Destination, Start Date, and either End Date or Number of Days.');
      setLoading(false);
      return;
    }

    // IMPORTANT: Check if db is initialized before proceeding
    if (!db) { // This check is crucial to prevent the "No Firebase App" error
      setError('Firestore service not ready. Please try again or refresh the page.');
      setLoading(false);
      return;
    }

    try {
      // Initialize Gemini AI model
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      // Generate content using the prompt
      const result = await model.generateContent(generatePrompt());
      const response = await result.response;
      const text = response.text();

      // Save itinerary to Firestore
      // Dynamically import collection and addDoc to ensure they are available
      // after db is confirmed to be initialized.
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'itineraries'), {
        userId: currentUser.uid,
        startingLocation,
        destination,
        startDate,
        endDate: endDate || null,
        numberOfDays: numberOfDays || null,
        travelers,
        budget,
        interests: selectedInterests,
        pace,
        travelStyle,
        accommodationPreference,
        transportationPreference,
        dietaryRestrictions,
        itinerary: text,
        createdAt: new Date().toISOString()
      });

      setItinerary(text);
      navigate('/savedtrips');
    } catch (err) {
      // Enhanced error handling for API-specific errors
      if (err.message.includes('429') || err.message.includes('quota')) {
        setError('Quota Exceeded: You have made too many requests to the AI. Please wait a few minutes or hours and try again.');
      } else {
        setError('Failed to generate itinerary. Please try again. Error: ' + err.message);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 py-10 flex flex-col items-center justify-center font-inter">
      <div className="relative w-full max-w-4xl mx-auto px-4">
        <div className="relative bg-white rounded-3xl shadow-2xl ring-1 ring-gray-900/5 p-8 md:p-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-extrabold mb-10 text-center text-gray-900 tracking-tight">
              Craft Your Perfect Journey
            </h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Trip Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startingLocation" className="block text-sm font-medium text-gray-700 mb-1">
                    Starting Location (Optional)
                  </label>
                  <input
                    type="text"
                    id="startingLocation"
                    value={startingLocation}
                    onChange={(e) => setStartingLocation(e.target.value)}
                    placeholder="e.g., New York, USA"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  />
                </div>
                <div>
                  <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                    Destination <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="destination"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g., Paris, France"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(''); // Clear end date if start date changes to allow recalculation
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  />
                </div>
                <div>
                  <label htmlFor="numberOfDays" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Days (Optional)
                  </label>
                  <input
                    type="number"
                    id="numberOfDays"
                    value={numberOfDays}
                    onChange={(e) => {
                      setNumberOfDays(e.target.value);
                      setEndDate(''); // Clear end date if number of days changes
                    }}
                    min="1"
                    placeholder="e.g., 7"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setNumberOfDays(''); // Clear number of days if end date changes
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="travelers" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Travelers
                  </label>
                  <input
                    type="number"
                    id="travelers"
                    value={travelers}
                    onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  />
                </div>
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                    Budget <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="budget"
                    required
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g., $1000 USD"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  />
                </div>
              </div>

              {/* Preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {interests.map((interest) => (
                    <label key={interest} className="inline-flex items-center bg-gray-50 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors duration-200">
                      <input
                        type="checkbox"
                        checked={selectedInterests.includes(interest)}
                        onChange={() => handleInterestToggle(interest)}
                        className="h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">{interest}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="pace" className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Pace
                  </label>
                  <select
                    id="pace"
                    value={pace}
                    onChange={(e) => setPace(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  >
                    {paces.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="travelStyle" className="block text-sm font-medium text-gray-700 mb-1">
                    Travel Style
                  </label>
                  <select
                    id="travelStyle"
                    value={travelStyle}
                    onChange={(e) => setTravelStyle(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  >
                    {travelStyles.map((style) => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="accommodationPreference" className="block text-sm font-medium text-gray-700 mb-1">
                    Accommodation
                  </label>
                  <select
                    id="accommodationPreference"
                    value={accommodationPreference}
                    onChange={(e) => setAccommodationPreference(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                  >
                    {accommodationPreferences.map((pref) => (
                      <option key={pref} value={pref}>{pref}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="transportationPreference" className="block text-sm font-medium text-gray-700 mb-1">
                  Transportation Preference
                </label>
                <select
                  id="transportationPreference"
                  value={transportationPreference}
                  onChange={(e) => setTransportationPreference(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                >
                  {transportationPreferences.map((pref) => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dietaryRestrictions" className="block text-sm font-medium text-gray-700 mb-1">
                  Dietary Restrictions (Optional)
                </label>
                <textarea
                  id="dietaryRestrictions"
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  rows="3"
                  placeholder="e.g., Vegetarian, Gluten-free, No nuts"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                ></textarea>
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center font-medium bg-red-50 p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 ease-in-out hover:scale-105"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Itinerary...
                  </span>
                ) : (
                  'Generate My Dream Itinerary'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
