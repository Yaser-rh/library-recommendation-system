import { useState, useEffect } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getBooks, createBook, updateBook, deleteBook } from '@/services/api';
import { Book } from '@/types';
import { handleApiError, showSuccess } from '@/utils/errorHandling';

/**
 * Admin page component for managing books and viewing metrics
 */
export function Admin() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  const initialBookState = {
    title: '',
    author: '',
    genre: '',
    description: '',
    coverImage: '',
    rating: 0,
    publishedYear: new Date().getFullYear(),
    isbn: '',
  };

  const [formData, setFormData] = useState(initialBookState);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingBookId(null);
    setFormData(initialBookState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book: Book) => {
    setEditingBookId(book.id);
    setFormData({
      title: book.title,
      author: book.author,
      genre: book.genre,
      description: book.description,
      coverImage: book.coverImage,
      rating: book.rating,
      publishedYear: book.publishedYear,
      isbn: book.isbn,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.author) {
      alert('Please fill in required fields');
      return;
    }

    try {
      if (editingBookId) {
        const updated = await updateBook(editingBookId, formData);
        setBooks(books.map((b) => (b.id === editingBookId ? updated : b)));
        showSuccess('Book updated successfully!');
      } else {
        const created = await createBook(formData);
        setBooks([...books, created]);
        showSuccess('Book added successfully!');
      }
      setIsModalOpen(false);
      setFormData(initialBookState);
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      await deleteBook(id);
      setBooks(books.filter((book) => book.id !== id));
      showSuccess('Book deleted successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600 text-lg">Manage books and view system metrics</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Total Books</h3>
            <p className="text-5xl font-bold">{books.length}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Total Users</h3>
            <p className="text-5xl font-bold">42</p>
            <p className="text-sm mt-1 opacity-75">Placeholder data</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Active Reading Lists</h3>
            <p className="text-5xl font-bold">18</p>
            <p className="text-sm mt-1 opacity-75">Placeholder data</p>
          </div>
        </div>

        {/* Books Management */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Manage Books</h2>
            <Button variant="primary" onClick={handleOpenCreateModal}>
              Add New Book
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Author</th>
                  <th className="text-left py-3 px-4">Genre</th>
                  <th className="text-left py-3 px-4">Rating</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4">{book.title}</td>
                    <td className="py-3 px-4">{book.author}</td>
                    <td className="py-3 px-4">{book.genre}</td>
                    <td className="py-3 px-4">{book.rating}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditModal(book)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteBook(book.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Book Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingBookId ? 'Edit Book' : 'Add New Book'}
        >
          <div className="max-h-[60vh] overflow-y-auto">
            <Input
              label="Title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <Input
              label="Author"
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              required
            />

            <Input
              label="Genre"
              type="text"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
              />
            </div>

            <Input
              label="Cover Image URL"
              type="text"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
            />

            <Input
              label="Rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
            />

            <Input
              label="Published Year"
              type="number"
              value={formData.publishedYear}
              onChange={(e) =>
                setFormData({ ...formData, publishedYear: parseInt(e.target.value) })
              }
            />

            <Input
              label="ISBN"
              type="text"
              value={formData.isbn}
              onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
            />

            <div className="flex gap-3 mt-6">
              <Button variant="primary" onClick={handleSubmit} className="flex-1">
                {editingBookId ? 'Update Book' : 'Add Book'}
              </Button>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
