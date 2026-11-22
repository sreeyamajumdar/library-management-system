const express = require('express');
const Book = require('../models/Book');
const BookTransaction = require('../models/BookTransaction');
const auth = require('../middleware/auth');

const router = express.Router();

// Loan periods by role
const STUDENT_LOAN_DAYS = 14;
const TEACHER_LOAN_DAYS = 30;

/**
 * GET /api/transactions/stats
 * Return overall transaction statistics.
 */
router.get('/stats', auth, async (req, res) => {
  try {
   if (req.user.position?.toLowerCase() !== 'admin') {
     return res.status(403).json({ message: 'Access denied. Admin only.' });
   }

   const [activeBorrows, totalTransactions, pendingReturns] = await Promise.all([
     BookTransaction.countDocuments({ isReturned: false }),
     BookTransaction.countDocuments(),
     BookTransaction.countDocuments({ isReturned: false, isPendingReturn: true }),
   ]);
   res.json({ activeBorrows, totalTransactions, pendingReturns });
 } catch (error) {
   console.error('Transaction stats error:', error);
   res.status(500).json({ message: 'Server error fetching transaction stats.' });
 }
});

/**
 * GET /api/transactions/recent
 * Return last 10 transaction activities.
 */
router.get('/recent', auth, async (req, res) => {
 try {
   if (req.user.position?.toLowerCase() !== 'admin') {
     return res.status(403).json({ message: 'Access denied. Admin only.' });
   }

   const transactions = await BookTransaction.find()
     .populate('user', 'name enrollmentNumber')
     .populate('book', 'title author isbn')
     .sort({ borrowDate: -1 })
     .limit(10);

   const formatted = transactions.map((t) => ({
     _id: t._id,
     userName: t.user?.name || 'Unknown User',
     bookTitle: t.book?.title || 'Unknown Book',
     type: t.isReturned ? 'return' : t.isPendingReturn ? 'pending_return' : 'borrow',
     createdAt: t.isReturned ? t.returnDate || t.borrowDate : t.borrowDate,
   }));

   res.json({ count: formatted.length, transactions: formatted });
 } catch (error) {
   console.error('Recent activity error:', error);
   res.status(500).json({ message: 'Server error fetching recent activity.' });
 }
});

/**
 * POST /api/transactions/borrow
 * Borrow a book by its bookId.
 * Performs atomic decrement on availableCopies and increments borrowedCopies.
 * Enforces borrowing limit (max 6 for Students, 10 for Teachers) and duplicate loan prevention.
 * Sets dueDate to 14 days for Students, 30 days for Teachers.
 * Protected route.
 * Body: { bookId }
 */
router.post('/borrow', auth, async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: 'Book ID is required.' });
    }

    // 1. Check borrowing limit (10 for Teachers, 6 for Students)
    const isTeacher = req.user.position?.toLowerCase() === 'teacher';
    const maxLimit = isTeacher ? 10 : 6;
    const activeLoansCount = await BookTransaction.countDocuments({
      user: req.user._id,
      isReturned: false,
    });

    if (activeLoansCount >= maxLimit) {
      return res.status(400).json({
        message: `You have reached the maximum limit of ${maxLimit} borrowed books for ${req.user.position || 'Student'}. Please return an existing book before checking out another.`,
      });
    }

    // 2. Check if student already has this book borrowed
    const existingTransaction = await BookTransaction.findOne({
      user: req.user._id,
      book: bookId,
      isReturned: false,
    });

    if (existingTransaction) {
      return res.status(400).json({ message: 'You already have an active loan for this book.' });
    }

    // 3. Atomically decrement availableCopies and increment borrowedCopies
    const updatedBook = await Book.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1, borrowedCopies: 1 } },
      { new: true }
    );

    if (!updatedBook) {
      const bookExists = await Book.findById(bookId);
      if (!bookExists) {
        return res.status(404).json({ message: 'Book not found in library inventory.' });
      }
      return res.status(400).json({ message: 'No copies of this book are currently available.' });
    }

    // 4. Calculate due date (role-based: 30 days for Teacher, 14 days for Student)
    const loanDays = isTeacher ? TEACHER_LOAN_DAYS : STUDENT_LOAN_DAYS;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);

    // 5. Create the transaction
    const transaction = new BookTransaction({
      user: req.user._id,
      book: bookId,
      dueDate,
    });
    await transaction.save();

    await transaction.populate('book', 'title author isbn edition courses totalCopies availableCopies coverImage');

    res.status(201).json({
      message: `Book borrowed successfully!`,
      dueDate,
      dueDateFormatted: dueDate.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      transaction,
      book: updatedBook,
    });
  } catch (error) {
    console.error('Borrow error:', error);
    res.status(500).json({ message: 'Server error during borrow.' });
  }
});

/**
 * POST /api/transactions/request-return
 * Student requests to return a borrowed book.
 * Sets status to 'Approval Pending' until a Librarian approves and confirms.
 * Body: { bookId } or { transactionId }
 * Protected route.
 */
router.post('/request-return', auth, async (req, res) => {
  try {
    const { bookId, transactionId } = req.body;

    const query = {
      user: req.user._id,
      isReturned: false,
    };

    if (transactionId) {
      query._id = transactionId;
    } else if (bookId) {
      query.book = bookId;
    } else {
      return res.status(400).json({ message: 'Book ID or Transaction ID is required.' });
    }

    const transaction = await BookTransaction.findOne(query).populate('book', 'title author isbn');

    if (!transaction) {
      return res.status(404).json({ message: 'Active loan not found for this book.' });
    }

    if (transaction.isPendingReturn) {
      return res.status(400).json({
        message: 'Approval pending: Return request is already submitted and awaiting librarian confirmation.',
      });
    }

    const daysOverdue = transaction.dueDate < new Date()
      ? Math.ceil((new Date() - new Date(transaction.dueDate)) / (1000 * 60 * 60 * 24))
      : 0;

    transaction.isPendingReturn = true;
    transaction.returnRequestedAt = new Date();
    await transaction.save();

    res.json({
      message: 'Return request submitted. Approval pending: Please hand the physical book to the librarian to approve and confirm.',
      isPendingReturn: true,
      transaction,
      daysOverdue,
    });
  } catch (error) {
    console.error('Request return error:', error);
    res.status(500).json({ message: 'Server error submitting return request.' });
  }
});

/**
 * GET /api/transactions/pending-returns
 * Librarian gets all books waiting for return approval.
 * Admin only.
 */
router.get('/pending-returns', auth, async (req, res) => {
  try {
    if (req.user.position?.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Librarian/Admin only.' });
    }

    const pending = await BookTransaction.find({
      isReturned: false,
      isPendingReturn: true,
    })
      .populate('user', 'name enrollmentNumber department position')
      .populate('book', 'title author isbn edition totalCopies availableCopies')
      .sort({ returnRequestedAt: -1 });

    const formatted = pending.map((t) => {
      const daysOverdue = t.dueDate < new Date()
        ? Math.ceil((new Date() - new Date(t.dueDate)) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        _id: t._id,
        user: t.user,
        book: t.book,
        borrowDate: t.borrowDate,
        dueDate: t.dueDate,
        returnRequestedAt: t.returnRequestedAt,
        daysOverdue,
      };
    });

    res.json({ count: formatted.length, pendingReturns: formatted });
  } catch (error) {
    console.error('Pending returns error:', error);
    res.status(500).json({ message: 'Server error fetching pending returns.' });
  }
});

/**
 * POST /api/transactions/approve-return
 * Librarian approves and confirms a student book return.
 * Increases book availableCopies, marks isReturned: true.
 * Admin only.
 * Body: { transactionId }
 */
router.post('/approve-return', auth, async (req, res) => {
  try {
    if (req.user.position?.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Librarian/Admin only.' });
    }

    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required.' });
    }

    const transaction = await BookTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction record not found.' });
    }

    if (transaction.isReturned) {
      return res.status(400).json({ message: 'This book has already been confirmed returned.' });
    }

    // Mark as returned and clear pending flag
    transaction.isReturned = true;
    transaction.isPendingReturn = false;
    transaction.returnDate = new Date();
    await transaction.save();

    // Increment availableCopies, decrement borrowedCopies atomically
    const updatedBook = await Book.findByIdAndUpdate(
      transaction.book,
      { $inc: { availableCopies: 1, borrowedCopies: -1 } },
      { new: true }
    );

    await transaction.populate('user', 'name enrollmentNumber');
    await transaction.populate('book', 'title author isbn');

    res.json({
      message: `Return approved successfully! "${updatedBook ? updatedBook.title : 'Book'}" has been returned to inventory.`,
      transaction,
      book: updatedBook,
    });
  } catch (error) {
    console.error('Approve return error:', error);
    res.status(500).json({ message: 'Server error approving book return.' });
  }
});

/**
 * GET /api/transactions/my-books
 * Get the current user's currently borrowed books, including return status and overdue fines.
 * Protected route.
 */
router.get('/my-books', auth, async (req, res) => {
  try {
    const transactions = await BookTransaction.find({
      user: req.user._id,
      isReturned: false,
    })
      .populate('book', 'title author isbn genre edition courses totalCopies availableCopies coverImage')
      .sort({ borrowDate: -1 });

    let totalOverdueCount = 0;

    const enriched = transactions.map((t) => {
      const daysOverdue = t.dueDate < new Date()
        ? Math.ceil((new Date() - new Date(t.dueDate)) / (1000 * 60 * 60 * 24))
        : 0;
      if (daysOverdue > 0) totalOverdueCount++;

      return {
        _id: t._id,
        book: t.book,
        borrowDate: t.borrowDate,
        dueDate: t.dueDate,
        isReturned: t.isReturned,
        isPendingReturn: !!t.isPendingReturn,
        returnRequestedAt: t.returnRequestedAt,
        daysOverdue,
        isOverdue: daysOverdue > 0,
      };
    });

    res.json({
      count: enriched.length,
      transactions: enriched,
      totalOverdueCount,
    });
  } catch (error) {
    console.error('My books error:', error);
    res.status(500).json({ message: 'Server error fetching borrowed books.' });
  }
});

/**
 * GET /api/transactions/history
 * Get the current user's full transaction history (borrowed + returned).
 * Protected route.
 */
router.get('/history', auth, async (req, res) => {
  try {
    const transactions = await BookTransaction.find({ user: req.user._id })
      .populate('book', 'title author isbn genre coverImage')
      .sort({ borrowDate: -1 });

    res.json({ count: transactions.length, transactions });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ message: 'Server error fetching transaction history.' });
  }
});

module.exports = router;
