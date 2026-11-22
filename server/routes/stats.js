const express = require('express');
const User = require('../models/User');
const Book = require('../models/Book');
const LibrarySession = require('../models/LibrarySession');
const BookTransaction = require('../models/BookTransaction');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/stats
 * Consolidated dashboard statistics.
 * Role-aware:
 * - Admin receives full library-wide metrics (total registered members, system-wide active borrows, pending returns, visitor sessions).
 * - Students and Teachers receive only their personal loan metrics and general catalog size; total-user counts are strictly hidden.
 */
router.get('/', auth, async (req, res) => {
  try {
    const isAdmin = req.user?.position?.toLowerCase() === 'admin';

    // 1. Non-admin view (Students & Teachers): strictly private user-scoped metrics
    if (!isAdmin) {
      const [myTransactions, booksAgg, totalBookTitles, activeSessionCount] = await Promise.all([
        BookTransaction.find({ user: req.user._id, isReturned: false })
          .populate('book', 'title author isbn')
          .sort({ borrowDate: -1 }),
        Book.aggregate([
          {
            $group: {
              _id: null,
              totalCopies: { $sum: '$totalCopies' },
              borrowedCopies: { $sum: '$borrowedCopies' },
            },
          },
        ]),
        Book.countDocuments(),
        LibrarySession.countDocuments({ isActive: true }),
      ]);

      const totalCopies = booksAgg[0]?.totalCopies || 0;
      const personalBorrowCount = myTransactions.length;

      return res.json({
        // Total users count is intentionally omitted for privacy
        currentVisitors: activeSessionCount,
        activeInLibrary: activeSessionCount,
        totalBooks: totalBookTitles,
        totalCopies,
        booksBorrowed: personalBorrowCount,
        activeBorrows: personalBorrowCount,
        pendingReturns: myTransactions.filter((tx) => tx.isPendingReturn).length,
        recentActivity: myTransactions.map((tx) => ({
          _id: tx._id,
          user: { _id: req.user._id, name: req.user.name, enrollmentNumber: req.user.enrollmentNumber },
          book: tx.book,
          userName: req.user.name,
          bookTitle: tx.book?.title || 'Unknown Book',
          type: tx.isReturned ? 'return' : 'borrow',
          isReturned: tx.isReturned,
          borrowDate: tx.borrowDate,
          returnDate: tx.returnDate,
          dueDate: tx.dueDate,
          createdAt: tx.isReturned ? tx.returnDate || tx.borrowDate : tx.borrowDate,
        })),
        userScoped: true,
      });
    }

    // 2. Admin view: full administrative statistics
    const [
      totalUsers,
      currentVisitors,
      totalBooks,
      activeBorrows,
      pendingReturns,
      booksAgg,
      rawActivity,
    ] = await Promise.all([
      User.countDocuments(),
      LibrarySession.countDocuments({ isActive: true }),
      Book.countDocuments(),
      BookTransaction.countDocuments({ isReturned: false }),
      BookTransaction.countDocuments({ isReturned: false, isPendingReturn: true }),
      Book.aggregate([
        {
          $group: {
            _id: null,
            totalCopies: { $sum: '$totalCopies' },
            borrowedCopies: { $sum: '$borrowedCopies' },
          },
        },
      ]),
      BookTransaction.find()
        .populate('user', 'name enrollmentNumber')
        .populate('book', 'title author isbn')
        .sort({ borrowDate: -1 })
        .limit(10),
    ]);

    const totalCopies = booksAgg[0]?.totalCopies || 0;
    const totalBorrowedCopies = booksAgg[0]?.borrowedCopies || 0;

    const recentActivity = rawActivity.map((t) => ({
      _id: t._id,
      user: t.user,
      book: t.book,
      userName: t.user?.name || 'Unknown User',
      bookTitle: t.book?.title || 'Unknown Book',
      type: t.isReturned ? 'return' : t.isPendingReturn ? 'pending_return' : 'borrow',
      isReturned: t.isReturned,
      borrowDate: t.borrowDate,
      returnDate: t.returnDate,
      dueDate: t.dueDate,
      createdAt: t.isReturned ? t.returnDate || t.borrowDate : t.borrowDate,
    }));

    res.json({
      totalUsers, // Available only to Admin
      currentVisitors,
      activeInLibrary: currentVisitors,
      totalBooks,
      totalCopies,
      totalBorrowedCopies,
      booksBorrowed: activeBorrows,
      activeBorrows,
      pendingReturns,
      recentActivity,
      userScoped: false,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics.' });
  }
});

module.exports = router;
