import { useState, useEffect } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getReadingLists, createReadingList, deleteReadingList, getBook } from '@/services/api';

import { ReadingList } from '@/types';
import { formatDate } from '@/utils/formatters';
import { handleApiError, showSuccess } from '@/utils/errorHandling';

/**
 * ReadingLists page component
 */
export function ReadingLists() {
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    setIsLoading(true);
    try {
      const data = await getReadingLists();

      // Fetch full book details for each list
      const listsWithBooks = await Promise.all(
        data.map(async (list) => {
          const bookIds =
            list.bookIds || ((Array.isArray(list.books) ? list.books : []) as string[]);
          const books = await Promise.all(
            bookIds.map(async (idOrBook) => {
              if (typeof idOrBook === 'object') return idOrBook;
              try {
                return await getBook(idOrBook);
              } catch {
                return null;
              }
            })
          );
          return {
            ...list,
            books: books.filter((b) => b !== null),
          };
        })
      );

      setLists(listsWithBooks);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      alert('Please enter a list name');
      return;
    }

    try {
      // TODO: Replace with DynamoDB put operation
      const newList = await createReadingList({
        userId: '1', // TODO: Get from auth context
        name: newListName,
        description: newListDescription,
        bookIds: [],
      });
      setLists([...lists, newList]);
      setIsModalOpen(false);
      setNewListName('');
      setNewListDescription('');
      showSuccess('Reading list created successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDeleteList = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this reading list?')) {
      return;
    }

    try {
      await deleteReadingList(id);
      setLists(lists.filter((list) => list.id !== id));
      showSuccess('Reading list deleted successfully!');
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">My Reading Lists</h1>
            <p className="text-slate-600 text-lg">Organize your books into custom lists</p>
          </div>
          <Button variant="primary" size="lg" onClick={() => setIsModalOpen(true)}>
            Create New List
          </Button>
        </div>

        {lists.length === 0 ? (
          <div className="text-center py-12 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200">
            <svg
              className="w-16 h-16 text-slate-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No reading lists yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first list to start organizing your books
            </p>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Create Your First List
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <div
                key={list.id}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {list.name || 'Untitled List'}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteList(e, list.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete list"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                <p className="text-slate-600 mb-6 line-clamp-2 text-sm">
                  {list.description || 'No description'}
                </p>

                {/* Book Previews */}
                <div className="flex -space-x-3 mb-4 overflow-hidden py-1">
                  {(list.books || []).slice(0, 4).map((book, i) => {
                    // Handle both full Book objects and string IDs
                    const cover =
                      typeof book === 'object' && book.coverImage
                        ? book.coverImage
                        : `https://placehold.co/100x150?text=${typeof book === 'string' ? 'Book' : 'Cover'}`;
                    const title = typeof book === 'object' ? book.title : 'Book Title';

                    return (
                      <div
                        key={i}
                        className="relative w-12 h-16 rounded-md shadow-md border-2 border-white overflow-hidden flex-shrink-0 transition-transform hover:-translate-y-1"
                      >
                        <img
                          src={cover}
                          alt={title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/100x150?text=No+Cover';
                          }}
                        />
                      </div>
                    );
                  })}
                  {(list.books || []).length === 0 && (
                    <div className="w-12 h-16 rounded-md bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-400">
                      Empty
                    </div>
                  )}
                  {(list.books || []).length > 4 && (
                    <div className="w-12 h-16 rounded-md bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500 z-10">
                      +{(list.books || []).length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 font-medium border-t pt-4">
                  <span>{(list.bookIds || list.books || []).length} books</span>
                  <span>{list.createdAt ? formatDate(list.createdAt) : 'Just now'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create New Reading List"
        >
          <div>
            <Input
              label="List Name"
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., Summer Reading 2024"
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="What's this list about?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleCreateList} className="flex-1">
                Create List
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
