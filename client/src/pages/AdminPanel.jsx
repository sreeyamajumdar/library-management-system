import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  BookOpen,
  Users,
  BarChart3,
  Printer,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'qr', label: 'QR Codes', icon: QrCode },
  { id: 'books', label: 'Manage Books', icon: BookOpen },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
  { id: 'returns', label: 'Approve Returns', icon: CheckCircle },
];

export default function AdminPanel() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('qr');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500">Manage library resources and configuration</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'qr' && <QRCodesTab />}
        {activeTab === 'books' && <ManageBooksTab api={api} />}
        {activeTab === 'users' && <UsersTab api={api} />}
        {activeTab === 'stats' && <StatsTab api={api} />}
        {activeTab === 'returns' && <ApproveReturnsTab api={api} />}
      </div>
    </div>
  );
}

/* ==================== QR Codes Tab ==================== */
function QRCodesTab() {
  const [baseUrl, setBaseUrl] = useState(window.location.origin);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration QR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📝 Registration</h3>
          <p className="text-sm text-gray-500 mb-4">Scan to register for library access</p>
          <div className="inline-block p-4 bg-white rounded-xl border-2 border-gray-100">
            <QRCodeSVG
              value={`${baseUrl}/register`}
              size={256}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-xs text-gray-400 mt-3 break-all">{baseUrl}/register</p>
        </div>

        {/* Login QR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🔑 Login</h3>
          <p className="text-sm text-gray-500 mb-4">Scan to log into the library</p>
          <div className="inline-block p-4 bg-white rounded-xl border-2 border-gray-100">
            <QRCodeSVG
              value={`${baseUrl}/login`}
              size={256}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-xs text-gray-400 mt-3 break-all">{baseUrl}/login</p>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Printer className="h-5 w-5" />
          Print QR Codes
        </button>
      </div>
    </div>
  );
}

/* ==================== Manage Books Tab ==================== */
function ManageBooksTab({ api }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    totalCopies: 1,
  });

  const genres = ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Literature', 'Mathematics', 'Philosophy', 'Art', 'Other'];

  const fetchBooks = useCallback(async () => {
    try {
      const res = await api.get('/books');
      setBooks(res.data.books || res.data || []);
    } catch {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await api.put(`/books/${editingBook._id}`, form);
        toast.success('Book updated');
      } else {
        await api.post('/books', form);
        toast.success('Book added');
      }
      resetForm();
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre || '',
      totalCopies: book.totalCopies || 1,
    });
    setShowForm(true);
  };

  const handleDelete = async (book) => {
    if (!confirm(`Delete "${book.title}"?`)) return;
    try {
      await api.delete(`/books/${book._id}`);
      toast.success('Book deleted');
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBook(null);
    setForm({ title: '', author: '', isbn: '', genre: '', totalCopies: 1 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Book
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {editingBook ? 'Edit Book' : 'Add New Book'}
            </h3>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
              <input
                type="text"
                required
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
              <input
                type="text"
                required
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
              <select
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">Select</option>
                {genres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies</label>
              <input
                type="number"
                min="1"
                value={form.totalCopies}
                onChange={(e) => setForm({ ...form, totalCopies: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingBook ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Books Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-left">ISBN</th>
                <th className="px-4 py-3 text-left">Genre</th>
                <th className="px-4 py-3 text-center">Copies</th>
                <th className="px-4 py-3 text-center">Available</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {books.map((book) => (
                <tr key={book._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{book.title}</td>
                  <td className="px-4 py-3 text-gray-600">{book.author}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{book.isbn}</td>
                  <td className="px-4 py-3">
                    {book.genre && (
                      <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                        {book.genre}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{book.totalCopies || 1}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-medium ${
                        (book.totalCopies || 1) - (book.borrowedCopies || 0) > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {(book.totalCopies || 1) - (book.borrowedCopies || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleEdit(book)}
                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(book)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No books found. Add your first book above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== Users Tab ==================== */
function UsersTab({ api }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const params = search ? { search } : {};
      const res = await api.get('/users', { params });
      setUsers(res.data.users || res.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [api, search]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Enrollment No.</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Position</th>
                  <th className="px-4 py-3 text-left">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.enrollmentNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{u.department}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.position === 'Admin'
                            ? 'bg-purple-100 text-purple-700'
                            : u.position === 'Teacher'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.position}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Statistics Tab ==================== */
function StatsTab({ api }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats');
        const d = res.data;
        setStats({
          totalUsers: d.totalUsers ?? 0,
          activeInLibrary: d.currentVisitors ?? d.activeInLibrary ?? 0,
          totalBooks: d.totalBooks ?? 0,
          totalCopies: d.totalCopies ?? 0,
          activeBorrows: d.booksBorrowed ?? d.activeBorrows ?? 0,
          totalTransactions: d.totalTransactions ?? d.recentActivity?.length ?? 0,
        });
      } catch {
        try {
          const [usersRes, activeRes, booksRes, transactionsRes] = await Promise.allSettled([
            api.get('/users/count'),
            api.get('/sessions/active-count'),
            api.get('/books/stats'),
            api.get('/transactions/stats'),
          ]);

          setStats({
            totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.data.count : 0,
            activeInLibrary: activeRes.status === 'fulfilled' ? (activeRes.value.data.activeCount ?? activeRes.value.data.count ?? 0) : 0,
            totalBooks: booksRes.status === 'fulfilled' ? booksRes.value.data.totalBooks : 0,
            totalCopies: booksRes.status === 'fulfilled' ? booksRes.value.data.totalCopies : 0,
            activeBorrows: transactionsRes.status === 'fulfilled' ? transactionsRes.value.data.activeBorrows : 0,
            totalTransactions: transactionsRes.status === 'fulfilled' ? transactionsRes.value.data.totalTransactions : 0,
          });
        } catch {
          toast.error('Failed to load statistics');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    { label: 'Total Registered Users', value: stats.totalUsers, emoji: '👥' },
    { label: 'Currently in Library', value: stats.activeInLibrary, emoji: '📍' },
    { label: 'Total Unique Books', value: stats.totalBooks, emoji: '📚' },
    { label: 'Total Book Copies', value: stats.totalCopies, emoji: '📖' },
    { label: 'Currently Borrowed', value: stats.activeBorrows, emoji: '📤' },
    { label: 'Total Transactions', value: stats.totalTransactions, emoji: '📊' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statItems.map(({ label, value, emoji }) => (
        <div
          key={label}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center"
        >
          <div className="text-3xl mb-2">{emoji}</div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

/* ==================== Approve Returns Tab (Librarian Confirmation) ==================== */
function ApproveReturnsTab({ api }) {
  const [pendingReturns, setPendingReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/transactions/pending-returns');
      setPendingReturns(res.data.pendingReturns || []);
    } catch {
      toast.error('Failed to load pending returns');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (txId) => {
    setApprovingId(txId);
    try {
      const res = await api.post('/transactions/approve-return', { transactionId: txId });
      toast.success(res.data.message || 'Return approved and book restored to inventory!', { icon: '✅' });
      await fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve return');
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pending Return Requests</h2>
          <p className="text-xs text-gray-500">
            Students submit return requests from their dashboard. Inspect physical books and confirm their return here.
          </p>
        </div>
        <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
          {pendingReturns.length} Waiting for Approval
        </span>
      </div>

      {pendingReturns.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No Pending Returns</h3>
          <p className="text-xs text-gray-500 mt-1">All returned books have been approved and reconciled with inventory.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-[11px] border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Book Title & ISBN</th>
                  <th className="px-4 py-3">Borrowed On</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Overdue Fine</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingReturns.map((tx) => (
                  <tr key={tx._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{tx.user?.name || 'Unknown'}</p>
                      <p className="text-gray-500 font-mono text-[10px]">
                        {tx.user?.enrollmentNumber} • {tx.user?.department}
                      </p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-bold text-gray-900 truncate">{tx.book?.title || 'Unknown'}</p>
                      <p className="text-gray-500 font-mono text-[10px]">ISBN: {tx.book?.isbn || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(tx.borrowDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={tx.daysOverdue > 0 ? 'text-red-700 font-bold' : 'text-gray-600'}>
                        {new Date(tx.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tx.fineAmount > 0 ? (
                        <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-bold">
                          ₹{tx.fineAmount} ({tx.daysOverdue}d late)
                        </span>
                      ) : (
                        <span className="text-green-700 font-medium">₹0 (On Time)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleApprove(tx._id)}
                        disabled={approvingId === tx._id}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1 shadow-sm"
                      >
                        {approvingId === tx._id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve Return
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
