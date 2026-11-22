import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  BookOpen,
  BookMarked,
  MapPin,
  Clock,
  ScanLine,
  Library as LibraryIcon,
  AlertTriangle,
  AlertCircle,
  X,
  User,
  Hash,
  Award,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function TeacherDashboard() {
  const { api, user } = useAuth();
  const [stats, setStats] = useState({
    activeInLibrary: 0,
    totalBooks: 0,
    totalCopies: 0,
  });
  const [loading, setLoading] = useState(true);

  // Faculty borrowed books
  const [myLoans, setMyLoans] = useState([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [returningId, setReturningId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/stats');
      const data = res.data;
      setStats({
        activeInLibrary: data.currentVisitors ?? data.activeInLibrary ?? 0,
        totalBooks: data.totalBooks ?? 0,
        totalCopies: data.totalCopies ?? 0,
      });
    } catch {
      // Silently fail
    }
  }, [api]);

  const fetchMyLoans = useCallback(async () => {
    try {
      const res = await api.get('/transactions/my-books');
      setMyLoans(res.data.transactions || []);
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
      setSelectedLoan((prev) => (prev ? { ...prev, isPendingReturn: true } : null));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit return request');
    } finally {
      setReturningId(null);
    }
  };

  const statCards = [
    {
      label: 'Currently in Library',
      value: stats.activeInLibrary,
      subtext: 'live library visitors',
      icon: MapPin,
      color: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      pulse: true,
    },
    {
      label: 'Academic Catalog',
      value: stats.totalBooks,
      subtext: stats.totalCopies ? `${stats.totalCopies} copies in stock` : 'textbooks & references',
      icon: BookOpen,
      color: 'bg-teal-500',
      bgLight: 'bg-teal-50',
      textColor: 'text-teal-700',
    },
    {
      label: 'My Research Loans',
      value: `${myLoans.length} / 10`,
      subtext: 'active books (faculty limit: 10)',
      icon: BookMarked,
      color: 'bg-indigo-500',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-700',
    },
    {
      label: 'Overdue Loans',
      value: overdueCount,
      subtext:
        overdueCount > 0
          ? `${overdueCount} book(s) past submission due date`
          : 'All faculty loans on time',
      icon: AlertCircle,
      color: overdueCount > 0 ? 'bg-red-500' : 'bg-emerald-500',
      bgLight: overdueCount > 0 ? 'bg-red-50' : 'bg-emerald-50',
      textColor: overdueCount > 0 ? 'text-red-700' : 'text-emerald-700',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-emerald-100">
              <Award className="h-4 w-4 text-emerald-300" />
              <span>Faculty Academic Member</span>
              <span>•</span>
              <span>ID: {user?.facultyId || user?.enrollmentNumber || 'FACULTY'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Professor {user?.name}
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-xl">
              Department of {user?.department || 'Academics'}. You have access to extended research borrowing privileges, academic reserves, and instant self-checkout.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/scan"
              className="inline-flex items-center gap-2 bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <ScanLine className="h-4 w-4 text-emerald-600" />
              Self-Checkout Scanner
            </Link>
            <Link
              to="/books"
              className="inline-flex items-center gap-2 bg-emerald-800/80 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold border border-emerald-600 transition-all shadow-sm"
            >
              <LibraryIcon className="h-4 w-4" />
              Course Catalog
            </Link>
          </div>
        </div>
      </div>

      {/* Missed Submission Alert */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-red-900 text-sm">
              Missed Submission Notice: {overdueCount} Book(s) Overdue
            </p>
            <p className="text-red-700 mt-0.5">
              You have {overdueCount} book(s) past their scheduled return date. Please request a return and submit to the librarian.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards Grid (4 Cards — NO total users) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, subtext, icon: Icon, color, bgLight, textColor, pulse }) => (
          <div key={label} className={`${bgLight} rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className={`${color} p-2 rounded-xl`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                {pulse && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
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

      {/* Faculty Borrowed Books Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <BookMarked className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                My Active Faculty Loans ({myLoans.length} of 10)
              </h2>
              <p className="text-xs text-gray-500">Touch or click any borrowed book to inspect due dates or request return</p>
            </div>
          </div>

          <Link
            to="/scan"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Scan to Borrow More
          </Link>
        </div>

        {myLoans.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">No active faculty book loans</p>
            <p className="text-xs text-gray-400 mt-1">
              Visit the library catalog or scan an ISBN barcode to check out research materials.
            </p>
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
                      : 'border-gray-200 bg-white hover:border-emerald-400'
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
                        {loan.daysOverdue}d Overdue
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full whitespace-nowrap border border-emerald-200">
                        Active Loan
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      Due: {new Date(loan.dueDate).toLocaleDateString()}
                    </span>
                    <span className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5">
                      Inspect & Return →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for inspection & return */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 fade-in-up">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Faculty Loan Inspection</span>
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

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 bg-teal-50 rounded-xl">
                  <p className="text-[10px] text-teal-700 font-medium">Borrowed On</p>
                  <p className="text-sm font-bold text-teal-950">
                    {new Date(selectedLoan.borrowDate).toLocaleDateString()}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    selectedLoan.isOverdue ? 'bg-red-50 text-red-900' : 'bg-emerald-50 text-emerald-900'
                  }`}
                >
                  <p className={`text-[10px] font-medium ${selectedLoan.isOverdue ? 'text-red-600' : 'text-emerald-700'}`}>
                    Submission Due Date
                  </p>
                  <p className="text-sm font-bold">
                    {new Date(selectedLoan.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedLoan.isPendingReturn ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Clock className="h-4 w-4 text-amber-600" />
                    Status: Return Approval Pending
                  </p>
                  <p className="text-[11px] mt-1 text-amber-700">
                    Please hand the physical book to the Librarian. Once inspected, the librarian will approve and reconcile the inventory.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-[11px]">
                  When ready to return, click <strong>Request Return</strong>. The librarian will inspect and confirm the return to library stock.
                </p>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Close
              </button>

              {!selectedLoan.isPendingReturn && (
                <button
                  type="button"
                  onClick={() => handleRequestReturn(selectedLoan)}
                  disabled={returningId === selectedLoan._id}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {returningId === selectedLoan._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Clock className="h-4 w-4" />
                      <span>Return Book (Send for Approval)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
