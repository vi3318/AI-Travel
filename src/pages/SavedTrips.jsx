import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function SavedTrips() {
  const { currentUser } = useAuth();
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        const db = getFirestore();
        const q = query(
          collection(db, 'itineraries'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const trips = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setItineraries(trips);
      } catch (err) {
        setError('Failed to fetch itineraries');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchItineraries();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Saved Trips</h1>
          <Link
            to="/plan-trip"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Plan New Trip
          </Link>
        </div>

        {itineraries.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No trips saved</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by planning a new trip.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {itineraries.map((trip) => (
              <div
                key={trip.id}
                className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200"
              >
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {trip.destination}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Budget</dt>
                      <dd className="mt-1 text-sm text-gray-900">{trip.budget}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Pace</dt>
                      <dd className="mt-1 text-sm text-gray-900">{trip.pace}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Interests</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {trip.interests.join(', ')}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="px-4 py-4 sm:px-6">
                  <button
                    onClick={() => {/* TODO: Implement view details */}}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 