import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  MapPin,
  BookOpen,
  BookMarked,
  Activity,
  ScanLine,
  Library as LibraryIcon,
  AlertCircle,
  Clock,
  CheckCircle,
  X,
  User,
  Hash,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { api, user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeInLibrary: 0,
    totalBooks: 0,
    totalCopies: 0,
    booksBorrowed: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student's borrowed books & overdue fines
  const [myLoans, setMyLoans] = useState([]);
  const [totalFines, setTotalFines] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [returningId, setReturningId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/stats');
      const data = res.data;

      if (user?.position?.toLowerCase() !== 'admin') {
        const personalLoanCount = Array.isArray(data.recentActivity) ? data.recentActivity.length : 0;
        setStats({
          totalUsers: data.totalUsers ?? 0,
          activeInLibrary: 0,
          totalBooks: data.totalBooks ?? 0,
          totalCopies: data.totalCopies ?? 0,
          booksBorrowed: data.booksBorrowed ?? personalLoanCount,
        });
      } else {
        setStats({
          totalUsers: data.totalUsers ?? 0,
          activeInLibrary: data.currentVisitors ?? data.activeInLibrary ?? 0,
          totalBooks: data.totalBooks ?? 0,
          totalCopies: data.totalCopies ?? 0,
          booksBorrowed: data.booksBorrowed ?? data.activeBorrows ?? 0,
        });
      }

      if (Array.isArray(data.recentActivity)) {
        setRecentActivity(data.recentActivity);
      }
    } catch {
      // Fallback
      try {
        const [usersRes, activeRes, booksRes, transactionsRes] = await Promise.allSettled([
          api.get('/users/count'),
          api.get('/sessions/active-count'),
          api.get('/books/stats'),
          api.get('/transactions/stats'),
        ]);

        const booksData = booksRes.status === 'fulfilled' ? booksRes.value.data : {};
        const transData = transactionsRes.status === 'fulfilled' ? transactionsRes.value.data : {};
        const activeData = activeRes.status === 'fulfilled' ? activeRes.value.data : {};
        const usersData = usersRes.status === 'fulfilled' ? usersRes.value.data : {};

        setStats({
          totalUsers: usersData.count ?? usersData.totalUsers ?? 0,
          activeInLibrary: user?.position?.toLowerCase() === 'admin' ? activeData.activeCount ?? activeData.count ?? 0 : 0,
          totalBooks: booksData.totalBooks ?? 0,
          totalCopies: booksData.totalCopies ?? 0,
          booksBorrowed: user?.position?.toLowerCase() === 'admin' ? transData.activeBorrows ?? 0 : myLoans.length,
        });
      } catch {
        // Silently fail
      }
    }
  }, [api, user, myLoans.length]);

  const fetchMyLoans = useCallback(async () => {
    try {
      const res = await api.get('/transactions/my-books');
      setMyLoans(res.data.transactions || []);
      setTotalFines(res.data.totalFines || 0);
      setOverdueCount(res.data.totalOverdueCount || 0);
    } catch {
      // Ignore
    }
  }, [api]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchMyLoans()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchMyLoans]);

  // Poll active count every 10 seconds for real-time visitor tracking
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/sessions/active-count');
        const count = res.data?.activeCount ?? res.data?.count ?? 0;
        setStats((prev) => ({ ...prev, activeInLibrary: count }));
      } catch {
        // Ignore polling errors
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [api]);

  // Handle Return Request (Sets to Approval Pending)
  const handleRequestReturn = async (loan) => {
    if (returningId) return;
    setReturningId(loan._id);
    try {
      const res = await api.post('/transactions/request-return', { transactionId: loan._id });
      toast.success(
        res.data.message || 'Approval Pending: Hand the physical book to the librarian to approve and confirm.',
        { icon: '⏳', duration: 6000 }
      );
      await fetchMyLoans();
      // Update selected loan state if modal is open
      setSelectedLoan((prev) => (prev ? { ...prev, isPendingReturn: true } : null));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit return request');
    } finally {
      setReturningId(null);
    }
  };

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      subtext: 'registered members',
      icon: Users,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: 'Currently in Library',
      value: stats.activeInLibrary,
      subtext: 'live library visitors',
      icon: MapPin,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-700',
      pulse: true,
    },
    {
      label: 'Total Books',
      value: stats.totalBooks,
      subtext: stats.totalCopies ? `${stats.totalCopies} physical copies` : 'titles in catalog',
      icon: BookOpen,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      label: 'Books Borrowed',
      value: stats.booksBorrowed,
      subtext: 'active loans across all users',
      icon: BookMarked,
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      label: 'Overdue Fines Due',
      value: `₹${totalFines}`,
      subtext:
        totalFines > 0
          ? `${overdueCount} book(s) past submission due date`
          : 'All your loans are on time (₹0 fine)',
      icon: AlertCircle,
      color: totalFines > 0 ? 'bg-red-500' : 'bg-emerald-500',
      bgLight: totalFines > 0 ? 'bg-red-50' : 'bg-emerald-50',
      textColor: totalFines > 0 ? 'text-red-700' : 'text-emerald-700',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Library overview, overdue fines, and your active book loans</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <ScanLine className="h-4 w-4" />
            Open Book Scanner
          </Link>
          <Link
            to="/books"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 transition-colors shadow-sm"
          >
            <LibraryIcon className="h-4 w-4" />
            View Inventory
          </Link>
        </div>
      </div>

      {/* Overdue Fine Notice Banner if fines > 0 */}
      {totalFines > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-red-900 text-sm">
              Missed Submission Notice: ₹{totalFines} Late Fine Due!
            </p>
            <p className="text-red-700 mt-0.5">
              You have {overdueCount} book(s) past their due date. Overdue fine is accumulated at ₹5/day. Please return
              your overdue books to the librarian as soon as possible.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, subtext, icon: Icon, color, bgLight, textColor, pulse }) => (
          <div key={label} className={`${bgLight} rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className={`${color} p-2 rounded-xl`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                {pulse && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                )}
              </div>
              <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
              <p className="text-xs font-bold text-gray-800 mt-1">{label}</p>
            </div>
            {subtext && <p className="text-[11px] text-gray-500 mt-2">{subtext}</p>}
          </div>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* MY BORROWED BOOKS SECTION (Touch / Click to Open) */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <BookMarked className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">My Borrowed Books ({myLoans.length})</h2>
              <p className="text-xs text-gray-500">Touch or click on any borrowed book to inspect due date & return</p>
            </div>
          </div>

          <Link
            to="/scan"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Scan to Borrow More
          </Link>
        </div>

        {myLoans.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">No active book loans</p>
            <p className="text-xs text-gray-400 mt-1">Visit the book inventory or scan a book's ISBN to check out.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myLoans.map((loan) => {
              const b = loan.book || {};
              const isOverdue = loan.isOverdue;
              const isPending = loan.isPendingReturn;

              return (
                <div
                  key={loan._id}
                  onClick={() => setSelectedLoan(loan)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                    isPending
                      ? 'border-amber-300 bg-amber-50/40'
                      : isOverdue
                      ? 'border-red-300 bg-red-50/40'
                      : 'border-gray-200 bg-white hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{b.title || 'Untitled Book'}</h3>
                      <p className="text-xs text-gray-500 truncate">{b.author || 'Unknown'}</p>
                    </div>
                    {isPending ? (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full whitespace-nowrap border border-amber-200">
                        Approval Pending
                      </span>
                    ) : isOverdue ? (
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full whitespace-nowrap border border-red-200">
                        {loan.daysOverdue}d Late (₹{loan.fineAmount})
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full whitespace-nowrap border border-green-200">
                        Active Loan
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      Due: {new Date(loan.dueDate).toLocaleDateString()}
                    </span>
                    <span className="text-indigo-600 font-semibold hover:underline flex items-center gap-0.5">
                      View & Return →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* LOAN DETAILS & RETURN MODAL (Touch to Open) */}
      {/* ==================================================================== */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 fade-in-up">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Borrowed Book Details</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{selectedLoan.book?.title}</h3>
              </div>
              <button
                onClick={() => setSelectedLoan(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                <p className="flex items-center gap-2 text-gray-700">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <strong>Author:</strong> {selectedLoan.book?.author}
                </p>
                <p className="flex items-center gap-2 text-gray-700 font-mono">
                  <Hash className="h-3.5 w-3.5 text-gray-400" />
                  <strong>ISBN:</strong> {selectedLoan.book?.isbn || 'N/A'}
                </p>
                {selectedLoan.book?.edition && (
                  <p className="flex items-center gap-2 text-gray-700">
                    <BookMarked className="h-3.5 w-3.5 text-gray-400" />
                    <strong>Edition:</strong> {selectedLoan.book?.edition}
                  </p>
                )}
              </div>

              {/* Due Date & Fine Calculations */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-[10px] text-blue-600 font-medium">Borrowed On</p>
                  <p className="text-sm font-bold text-blue-900">
                    {new Date(selectedLoan.borrowDate).toLocaleDateString()}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    selectedLoan.isOverdue ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'
                  }`}
                >
                  <p className={`text-[10px] font-medium ${selectedLoan.isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                    Submission Due Date
                  </p>
                  <p className="text-sm font-bold">
                    {new Date(selectedLoan.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Overdue Fine Alert */}
              {selectedLoan.isOverdue && (
                <div className="p-3 bg-red-100/70 border border-red-200 rounded-xl text-red-900 text-xs space-y-0.5">
                  <p className="font-bold flex items-center gap-1 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    Missed Submission Deadline ({selectedLoan.daysOverdue} days late)
                  </p>
                  <p className="text-[11px]">
                    Accumulated late fine: <strong>₹{selectedLoan.fineAmount}</strong> (₹5 per day overdue). Please return
                    to the library immediately.
                  </p>
                </div>
              )}

              {/* Status Notice */}
              {selectedLoan.isPendingReturn ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Clock className="h-4 w-4 text-amber-600" />
                    Return Status: Approval Pending
                  </p>
                  <p className="text-[11px] mt-1 text-amber-700">
                    You have requested to return this book. Please hand the physical copy to the Librarian. Only the
                    Librarian can inspect, approve, and confirm the return to library inventory.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-[11px]">
                  When you are ready to return this book, click <strong>Request Return</strong>. Your return will be marked
                  as <em>Approval Pending</em> until the librarian approves it.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Close
              </button>

              {!selectedLoan.isPendingReturn ? (
                <button
                  type="button"
                  onClick={() => handleRequestReturn(selectedLoan)}
                  disabled={returningId === selectedLoan._id}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {returningId === selectedLoan._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>Return Book (Send for Approval)</>
                  )}
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 py-2.5 px-4 bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Approval Pending
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentActivity.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No recent book check-outs or returns recorded yet.
            </div>
          ) : (
            recentActivity.slice(0, 10).map((activity, i) => {
              const userName = activity.userName || activity.user?.name || 'Library Member';
              const bookTitle = activity.bookTitle || activity.book?.title || 'Book';
              const isBorrow = activity.type === 'borrow';
              const isPending = activity.type === 'pending_return';
              const dateVal = activity.createdAt || activity.borrowDate || activity.date;

              return (
                <div key={activity._id || i} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        isBorrow ? 'bg-indigo-500' : isPending ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {userName}{' '}
                        <span className="text-gray-500 font-normal">
                          {isBorrow ? 'borrowed' : isPending ? 'requested return for' : 'returned'}
                        </span>{' '}
                        <span className="font-semibold text-gray-800">{bookTitle}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {dateVal ? new Date(dateVal).toLocaleString() : ''}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
