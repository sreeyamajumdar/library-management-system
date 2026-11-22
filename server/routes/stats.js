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
 * Returns user-scoped data for students and full-library data for admins.
 */
router.get('/', auth, async (req, res) => {
  try {
    const isAdmin = req.user?.position?.toLowerCase() === 'admin';

    if (!isAdmin) {
      const [myTransactions, booksAgg, totalUsers] = await Promise.all([
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
        User.countDocuments(),
      ]);

      const totalCopies = booksAgg[0]?.totalCopies || 0;
      const personalBorrowCount = myTransactions.length;
      const totalFines = myTransactions.reduce((sum, tx) => {
        if (tx.isReturned || !tx.dueDate) return sum;
        const due = new Date(tx.dueDate);
        const now = new Date();
        if (now > due) {
          const diffDays = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
          return sum + diffDays * 5;
        }
        return sum;
      }, 0);

      return res.json({
        totalUsers,
        currentVisitors: 0,
        activeInLibrary: 0,
        totalBooks: await Book.countDocuments(),
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
        totalFines,
        userScoped: true,
      });
    }

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
    const booksBorrowed = Math.max(activeBorrows, booksAgg[0]?.borrowedCopies || 0);

    const recentActivity = rawActivity.map((t) => ({
      _id: t._id,
      user: t.user,
      book: t.book,
      userName: t.user?.name || 'Unknown Member',
      bookTitle: t.book?.title || 'Unknown Book',
      type: t.isReturned ? 'return' : 'borrow',
      isReturned: t.isReturned,
      borrowDate: t.borrowDate,
      returnDate: t.returnDate,
      dueDate: t.dueDate,
      createdAt: t.isReturned ? t.returnDate || t.borrowDate : t.borrowDate,
    }));

    res.json({
      totalUsers,
      currentVisitors,
      activeInLibrary: currentVisitors,
      totalBooks,
      totalCopies,
      booksBorrowed,
      activeBorrows,
      pendingReturns,
      recentActivity,
      userScoped: false,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats.' });
  }
});

module.exports = router;
