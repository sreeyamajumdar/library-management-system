const express = require('express');
const Book = require('../models/Book');
const auth = require('../middleware/auth');

const router = express.Router();

const buildIsbnLookupVariants = (input) => {
  const raw = String(input || '').trim();
  const digits = raw.replace(/[^0-9X]/gi, '').toUpperCase();
  const variants = new Set([raw, digits]);

  if (/^93[0-9X]{8}$/i.test(digits)) {
    variants.add(`978${digits}`);
  }

  if (/^978[0-9X]{10}$/i.test(digits)) {
    variants.add(digits);
  }

  return [...variants].filter(Boolean);
};

/**
 * GET /api/books
 * List all books. Supports optional search query param
 * to filter by title, author, ISBN, or course (case-insensitive).
 * Query: ?search=keyword&semester=4&course=PCCCS401&genre=Fiction&availability=available
 */
router.get('/', async (req, res) => {
  try {
    const { search, semester, course, genre, availability } = req.query;
    let query = {};
    const conditions = [];

    // Text search across title, author, isbn, course name
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      conditions.push({
        $or: [
          { title: searchRegex },
          { author: searchRegex },
          { isbn: searchRegex },
          { 'courses.courseName': searchRegex },
          { 'courses.courseCode': searchRegex },
        ],
      });
    }

    // Filter by semester
    if (semester) {
      conditions.push({ semester: parseInt(semester) });
    }

    // Filter by course code
    if (course) {
      conditions.push({ 'courses.courseCode': new RegExp(course, 'i') });
    }

    // Filter by genre
    if (genre) {
      conditions.push({ genre: new RegExp(genre, 'i') });
    }

    // Filter by availability
    if (availability === 'available') {
      conditions.push({ availableCopies: { $gt: 0 } });
    } else if (availability === 'borrowed') {
      conditions.push({ borrowedCopies: { $gt: 0 } });
    }

    if (conditions.length > 0) {
      query = { $and: conditions };
    }

    const books = await Book.find(query).sort({ addedAt: -1 });
    res.json({ count: books.length, books });
  } catch (error) {
    console.error('List books error:', error);
    res.status(500).json({ message: 'Server error fetching books.' });
  }
});

/**
 * GET /api/books/stats
 * Return book statistics (total unique books, total copies, available copies).
 */
router.get('/stats', async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const agg = await Book.aggregate([
      {
        $group: {
          _id: null,
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' },
          borrowedCopies: { $sum: '$borrowedCopies' },
        },
      },
    ]);

    res.json({
      totalBooks,
      totalCopies: agg[0]?.totalCopies || 0,
      availableCopies: agg[0]?.availableCopies || 0,
      borrowedCopies: agg[0]?.borrowedCopies || 0,
    });
  } catch (error) {
    console.error('Book stats error:', error);
    res.status(500).json({ message: 'Server error fetching book stats.' });
  }
});

/**
 * GET /api/books/isbn/:isbn
 * Look up book(s) by ISBN (handles hyphens, alternate ISBNs, and multiple editions).
 */
router.get('/isbn/:isbn', async (req, res) => {
  try {
    const rawInput = (req.params.isbn || '').trim();
    if (!rawInput) {
      return res.status(400).json({ message: 'ISBN is required.' });
    }

    const lookupVariants = buildIsbnLookupVariants(rawInput);
    const searchConditions = [];

    lookupVariants.forEach((variant) => {
      searchConditions.push({ isbn: variant }, { alternateIsbns: variant });

      const rawDigits = variant.replace(/[^0-9X]/gi, '');
      if (rawDigits.length >= 8) {
        const regexPattern = rawDigits.split('').join('[- ]?');
        const isbnRegex = new RegExp('^' + regexPattern + '$', 'i');
        searchConditions.push({ isbn: isbnRegex }, { alternateIsbns: isbnRegex });
      }
    });

    const books = await Book.find({ $or: searchConditions });

    if (!books || books.length === 0) {
      return res.status(404).json({ message: 'Book not found in the library inventory.' });
    }

    if (books.length > 1) {
      return res.json({
        isMultiple: true,
        count: books.length,
        books,
      });
    }

    res.json({
      isMultiple: false,
      book: books[0],
    });
  } catch (error) {
    console.error('ISBN lookup error:', error);
    res.status(500).json({ message: 'Server error looking up book.' });
  }
});

/**
 * POST /api/books
 * Add a new book to the inventory.
 * Admin only.
 * Body: { title, author, isbn?, edition?, genre?, semester?, courses?, totalCopies?, availableCopies?, borrowedCopies?, alternateIsbns?, notes?, coverImage? }
 */
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.position !== 'admin' && req.user.position !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { title, author, isbn, edition, genre, semester, courses, totalCopies, availableCopies, borrowedCopies, alternateIsbns, notes, coverImage } = req.body;

    // Check if book with same ISBN already exists (only if ISBN is provided)
    if (isbn) {
      const existingBook = await Book.findOne({ isbn });
      if (existingBook) {
        return res.status(400).json({ message: 'A book with this ISBN already exists.' });
      }
    }

    const book = new Book({
      title,
      author,
      isbn: isbn || null,
      edition,
      genre,
      semester: semester || [],
      courses: courses || [],
      totalCopies: totalCopies || 1,
      availableCopies: availableCopies !== undefined ? availableCopies : (totalCopies || 1),
      borrowedCopies: borrowedCopies || 0,
      alternateIsbns: alternateIsbns || [],
      notes,
      coverImage,
    });

    await book.save();
    res.status(201).json({ message: 'Book added successfully.', book });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A book with this ISBN already exists.' });
    }
    console.error('Add book error:', error);
    res.status(500).json({ message: 'Server error adding book.' });
  }
});

/**
 * PUT /api/books/:id
 * Update an existing book's details.
 * Admin only.
 * Body: any fields to update
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.position.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    res.json({ message: 'Book updated successfully.', book });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Update book error:', error);
    res.status(500).json({ message: 'Server error updating book.' });
  }
});

/**
 * DELETE /api/books/:id
 * Remove a book from the inventory.
 * Admin only.
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.position.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    res.json({ message: 'Book deleted successfully.' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ message: 'Server error deleting book.' });
  }
});

module.exports = router;
