import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const interests = [
  'Culture & History',
  'Food & Dining',
  'Nature & Outdoors',
  'Shopping',
  'Nightlife',
  'Art & Museums',
  'Adventure',
  'Relaxation',
  'Family Activities',
  'Local Experiences'
];

const paces = [
  'Relaxed',
  'Moderate',
  'Fast-paced'
];

export default function TripPlanner() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [pace, setPace] = useState(paces[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);

  const handleInterestToggle = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const generatePrompt = () => {
    return `Create a detailed travel itinerary for ${destination} from ${startDate} to ${endDate} with a budget of ${budget}. 
    The traveler is interested in: ${selectedInterests.join(', ')}.
    Preferred pace: ${pace}.
    Include daily activities, recommended restaurants, and estimated costs.`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const result = await model.generateContent(generatePrompt());
      const response = await result.response;
      const text = response.text();

      const db = getFirestore();
      await addDoc(collection(db, 'itineraries'), {
        userId: currentUser.uid,
        destination,
        startDate,
        endDate,
        budget,
        interests: selectedInterests,
        pace,
        itinerary: text,
        createdAt: new Date().toISOString()
      });

      setItinerary(text);
      navigate('/saved-trips');
    } catch (err) {
      setError('Failed to generate itinerary. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Plan Your Trip</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Destination</label>
                    <input
                      type="text"
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Budget</label>
                    <input
                      type="text"
                      required
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g., $1000"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                    <div className="grid grid-cols-2 gap-2">
                      {interests.map((interest) => (
                        <label key={interest} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedInterests.includes(interest)}
                            onChange={() => handleInterestToggle(interest)}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{interest}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Preferred Pace</label>
                    <select
                      value={pace}
                      onChange={(e) => setPace(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {paces.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate Itinerary'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 