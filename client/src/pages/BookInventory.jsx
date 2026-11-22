import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import BookCard from '../components/BookCard';
import { useAuth } from '../context/AuthContext';

export default function BookInventory() {
  const { api, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [availability, setAvailability] = useState('');
  const [semester, setSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    totalCopies: 1,
    edition: '',
    semester: [],
    courseCode: '',
    courseName: '',
  });

  const genres = [
    'Signals & Systems', 'Database Management', 'Theory of Computation',
    'Operating Systems', 'Software Engineering', 'Neural Networks & Deep Learning',
    'Quantum Computing', 'Constitution & Polity', 'Computer Organization',
    'Discrete Mathematics', 'Artificial Intelligence & ML', 'Algorithms',
    'Object-Oriented Programming', 'Data Analytics', 'Digital Electronics',
    'Data Structures', 'Computer Science', 'Technology', 'Science',
    'Fiction', 'Non-Fiction', 'Other'
  ];

  const fetchBooks = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (genre) params.genre = genre;
      if (availability) params.availability = availability;
      if (semester) params.semester = semester;
      const res = await api.get('/books', { params });
      setBooks(res.data.books || res.data || []);
    } catch {
      toast.error('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [api, search, genre, availability, semester]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchBooks();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchBooks]);

  const handleBorrow = (book) => {
    // Redirect to scanner: user must scan the physical ISBN to borrow
    navigate(
      `/scan?bookId=${book._id}&isbn=${encodeURIComponent(book.isbn || '')}&title=${encodeURIComponent(
        book.title
      )}`
    );
  };

  const handleReturn = async (book) => {
    try {
      const res = await api.post('/transactions/request-return', { bookId: book._id });
      toast.success(
        res.data.message || 'Approval Pending: Please hand the book to the librarian to approve and confirm.',
        { icon: '⏳', duration: 5000 }
      );
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit return request');
    }
  };

  const handleSemesterToggle = (sem) => {
    setNewBook((prev) => {
      const semesters = prev.semester.includes(sem)
        ? prev.semester.filter((s) => s !== sem)
        : [...prev.semester, sem];
      return { ...prev, semester: semesters };
    });
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const bookData = { ...newBook };
      // Build courses array from courseCode/courseName if provided
      if (bookData.courseCode) {
        bookData.courses = [{ courseCode: bookData.courseCode, courseName: bookData.courseName || '' }];
      }
      delete bookData.courseCode;
      delete bookData.courseName;
      // Remove empty optional fields
      if (!bookData.edition) delete bookData.edition;
      if (bookData.semester.length === 0) delete bookData.semester;

      await api.post('/books', bookData);
      toast.success('Book added successfully');
      setShowAddModal(false);
      setNewBook({
        title: '',
        author: '',
        isbn: '',
        genre: '',
        totalCopies: 1,
        edition: '',
        semester: [],
        courseCode: '',
        courseName: '',
      });
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add book');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Inventory</h1>
          <p className="text-gray-500">{books.length} books in catalog</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Book
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white appearance-none"
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">All Semesters</option>
              <option value="4">Semester IV</option>
              <option value="5">Semester V</option>
            </select>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">All</option>
              <option value="available">Available</option>
              <option value="borrowed">All Borrowed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900">No books found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {books.map((book) => (
            <BookCard
              key={book._id}
              book={book}
              currentUserId={user?._id}
              onBorrow={handleBorrow}
              onReturn={handleReturn}
            />
          ))}
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Book</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddBook} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  type="text"
                  required
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                <input
                  type="text"
                  required
                  value={newBook.isbn}
                  onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edition</label>
                <input
                  type="text"
                  value={newBook.edition}
                  onChange={(e) => setNewBook({ ...newBook, edition: e.target.value })}
                  placeholder="e.g. 3rd Edition"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                <select
                  value={newBook.genre}
                  onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">Select genre</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBook.semester.includes(4)}
                      onChange={() => handleSemesterToggle(4)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Semester IV</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBook.semester.includes(5)}
                      onChange={() => handleSemesterToggle(5)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Semester V</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                <input
                  type="text"
                  value={newBook.courseCode}
                  onChange={(e) => setNewBook({ ...newBook, courseCode: e.target.value })}
                  placeholder="e.g. CS301"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input
                  type="text"
                  value={newBook.courseName}
                  onChange={(e) => setNewBook({ ...newBook, courseName: e.target.value })}
                  placeholder="e.g. Database Management Systems"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies</label>
                <input
                  type="number"
                  min="1"
                  value={newBook.totalCopies}
                  onChange={(e) => setNewBook({ ...newBook, totalCopies: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  Add Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
