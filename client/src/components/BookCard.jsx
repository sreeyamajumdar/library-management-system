import { BookOpen, User, Hash, Tag, GraduationCap, BookMarked, ScanLine } from 'lucide-react';

export default function BookCard({ book, onBorrow, onReturn, currentUserId }) {
  const available = book.availableCopies ?? (book.totalCopies || 1);
  const total = book.totalCopies || 1;
  const borrowed = book.borrowedCopies || (total - available);
  const isAvailable = available > 0;
  const isBorrowedByUser = book.borrowedBy?.includes(currentUserId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover placeholder */}
      <div className="h-36 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center relative">
        <BookOpen className="h-14 w-14 text-indigo-300" />
        {/* Semester badges */}
        {book.semester && book.semester.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {book.semester.map((sem) => (
              <span
                key={sem}
                className="text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full"
              >
                Sem {sem === 4 ? 'IV' : sem === 5 ? 'V' : sem}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="line-clamp-1">{book.author}</span>
        </p>
        {book.edition && (
          <p className="text-xs text-gray-400 mb-1">
            <BookMarked className="h-3 w-3 inline mr-1" />
            {book.edition}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          {book.isbn && (
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              <Hash className="h-2.5 w-2.5" />
              {book.isbn}
            </span>
          )}
          {book.genre && (
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">
              <Tag className="h-2.5 w-2.5" />
              {book.genre}
            </span>
          )}
          {book.courses && book.courses.slice(0, 2).map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full"
            >
              <GraduationCap className="h-2.5 w-2.5" />
              {c.courseCode}
            </span>
          ))}
        </div>

        {/* Availability stats */}
        <div className="grid grid-cols-3 gap-1 mb-3 text-center">
          <div className="bg-blue-50 rounded-lg py-1">
            <p className="text-xs font-bold text-blue-700">{total}</p>
            <p className="text-[10px] text-blue-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg py-1">
            <p className="text-xs font-bold text-green-700">{available}</p>
            <p className="text-[10px] text-green-500">Available</p>
          </div>
          <div className="bg-amber-50 rounded-lg py-1">
            <p className="text-xs font-bold text-amber-700">{borrowed}</p>
            <p className="text-[10px] text-amber-500">Borrowed</p>
          </div>
        </div>

        <div className="flex gap-2">
          {isBorrowedByUser ? (
            <button
              onClick={() => onReturn?.(book)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
            >
              Request Return
            </button>
          ) : isAvailable ? (
            <button
              onClick={() => onBorrow?.(book)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Scan to Borrow
            </button>
          ) : (
            <button
              disabled
              className="flex-1 bg-gray-200 text-gray-500 text-xs font-medium py-2 px-3 rounded-lg cursor-not-allowed"
            >
              Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
