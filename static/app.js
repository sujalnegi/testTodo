// API Endpoints
const GET_NOTES_URL = '/api/notes';
const SAVE_NOTE_URL = '/api/notes'; // POST for new, PUT for update requires ID
const DELETE_NOTE_URL = '/api/notes'; // requires ID
const LOGOUT_URL = '/api/logout';
const SESSION_URL = '/api/session';

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const notesListEl = document.getElementById('notes-list');
    const newNoteBtn = document.getElementById('new-note-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const emptyStateEl = document.getElementById('empty-state');
    const editorEl = document.getElementById('editor');
    const titleInput = document.getElementById('note-title');
    const bodyTextarea = document.getElementById('note-body');
    const saveStatusEl = document.getElementById('save-status');
    const loggedInUserEl = document.getElementById('logged-in-user');

    // State
    let notes = [];
    let activeNoteId = null;
    let saveTimeout = null;

    // Check auth
    try {
        const sessionRes = await fetch(SESSION_URL);
        if (!sessionRes.ok) {
            window.location.href = '/';
            return;
        }
        const sessionData = await sessionRes.json();
        loggedInUserEl.textContent = sessionData.username;
    } catch (err) {
        console.error("Session check failed", err);
        window.location.href = '/';
        return;
    }

    // Initialize
    await fetchNotes();

    // Event Listeners
    newNoteBtn.addEventListener('click', createNewNote);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Auto-resizing textarea
    bodyTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Auto-save listeners
    titleInput.addEventListener('input', handleInput);
    bodyTextarea.addEventListener('input', handleInput);

    // Functions
    async function fetchNotes() {
        try {
            const res = await fetch(GET_NOTES_URL);
            if (res.ok) {
                const data = await res.json();
                notes = data.notes;
                renderNotesList();
            } else if (res.status === 401) {
                window.location.href = '/';
            }
        } catch (err) {
            console.error("Failed to fetch notes", err);
        }
    }

    function renderNotesList() {
        notesListEl.innerHTML = '';
        
        notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = `note-item ${note.id === activeNoteId ? 'active' : ''}`;
            noteItem.dataset.id = note.id;
            
            // Format date
            let dateStr = 'Just now';
            if (note.updated_at) {
                const d = new Date(note.updated_at);
                dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            noteItem.innerHTML = `
                <div class="note-info">
                    <div class="note-item-title">${escapeHTML(note.title) || 'Untitled Note'}</div>
                    <div class="note-item-date">${escapeHTML(dateStr)}</div>
                </div>
                <button class="delete-btn" aria-label="Delete note">×</button>
            `;
            
            // Select note event
            noteItem.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) {
                    deleteNote(note.id);
                } else {
                    selectNote(note.id);
                }
            });
            
            notesListEl.appendChild(noteItem);
        });
    }

    function selectNote(id) {
        activeNoteId = id;
        const note = notes.find(n => n.id === id);
        
        if (note) {
            // Update UI
            emptyStateEl.classList.add('hidden');
            editorEl.classList.remove('hidden');
            
            // Populate fields
            titleInput.value = note.title;
            bodyTextarea.value = note.body;
            
            // Reset textarea height
            bodyTextarea.style.height = 'auto';
            setTimeout(() => {
                bodyTextarea.style.height = (bodyTextarea.scrollHeight) + 'px';
            }, 0);
            
            saveStatusEl.textContent = 'Saved';
            renderNotesList(); // Update active state in sidebar
        }
    }

    async function createNewNote() {
        newNoteBtn.disabled = true;
        try {
            const res = await fetch(GET_NOTES_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '', body: '' })
            });
            
            if (res.ok) {
                const data = await res.json();
                notes.unshift(data.note);
                activeNoteId = data.note.id;
                renderNotesList();
                selectNote(activeNoteId);
                titleInput.focus();
            } else if (res.status === 401) {
                window.location.href = '/';
            }
        } catch (err) {
            console.error("Failed to create note", err);
        } finally {
            newNoteBtn.disabled = false;
        }
    }

    async function deleteNote(id) {
        try {
            const res = await fetch(`${DELETE_NOTE_URL}/${id}`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                notes = notes.filter(n => n.id !== id);
                if (activeNoteId === id) {
                    activeNoteId = null;
                    emptyStateEl.classList.remove('hidden');
                    editorEl.classList.add('hidden');
                }
                renderNotesList();
            } else if (res.status === 401) {
                window.location.href = '/';
            }
        } catch (err) {
            console.error("Failed to delete note", err);
        }
    }

    function handleInput() {
        if (!activeNoteId) return;

        saveStatusEl.textContent = 'Saving...';
        
        // Update local state immediately
        const note = notes.find(n => n.id === activeNoteId);
        if (note) {
            note.title = titleInput.value;
            note.body = bodyTextarea.value;
            
            // Update list to reflect title change immediately
            renderNotesList();
        }

        // Debounce actual save
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveNote(activeNoteId, titleInput.value, bodyTextarea.value);
        }, 800);
    }

    async function saveNote(id, title, body) {
        try {
            const res = await fetch(`${SAVE_NOTE_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, body })
            });
            
            if (res.ok) {
                const data = await res.json();
                // Update local note with server's updated_at
                const index = notes.findIndex(n => n.id === id);
                if (index !== -1) {
                    notes[index] = data.note;
                }
                
                if (activeNoteId === id) {
                    saveStatusEl.textContent = 'Saved';
                    renderNotesList(); // to update date string
                }
            } else if (res.status === 401) {
                window.location.href = '/';
            }
        } catch (err) {
            console.error("Failed to save note", err);
            if (activeNoteId === id) {
                saveStatusEl.textContent = 'Error saving';
            }
        }
    }

    async function handleLogout(e) {
        e.preventDefault();
        try {
            await fetch(LOGOUT_URL, { method: 'POST' });
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            window.location.href = '/';
        }
    }

    // Utility
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
