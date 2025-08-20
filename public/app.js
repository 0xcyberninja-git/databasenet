// Global variables
let currentUser = null;
let authToken = null;
let allCalls = [];
let filteredCalls = [];
let commentSelectedFiles = new Map();

// API base URL
const API_BASE = '/api';

// Authentication functions
async function register(username, email, password) {
    try {
        const response = await fetch(`${API_BASE}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
}

async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
}

function setAuth(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearAuth() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        return true;
    }
    return false;
}

// API helper function
async function apiCall(endpoint, options = {}) {
    if (!authToken) {
        throw new Error('No authentication token');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API call failed');
    }

    return response.json();
}

// Call management functions
async function fetchCalls() {
    try {
        const calls = await apiCall('/calls');
        allCalls = calls;
        filteredCalls = [...calls];
        renderCallLog(filteredCalls);
        updateStatusCards(allCalls);
    } catch (error) {
        console.error('Error fetching calls:', error);
        showNotification('Error fetching calls', 'error');
    }
}

async function createCall(callData) {
    try {
        const newCall = await apiCall('/calls', {
            method: 'POST',
            body: JSON.stringify(callData)
        });
        
        // Refresh calls list
        await fetchCalls();
        return newCall;
    } catch (error) {
        console.error('Error creating call:', error);
        throw error;
    }
}

async function updateCallStatus(callId, status) {
    try {
        await apiCall(`/calls/${callId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        
        // Refresh calls list
        await fetchCalls();
    } catch (error) {
        console.error('Error updating call status:', error);
        throw error;
    }
}

async function deleteCall(callId) {
    try {
        await apiCall(`/calls/${callId}`, {
            method: 'DELETE'
        });
        
        // Refresh calls list
        await fetchCalls();
    } catch (error) {
        console.error('Error deleting call:', error);
        throw error;
    }
}

async function addComment(callId, text) {
    try {
        const comment = await apiCall(`/calls/${callId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        
        // Refresh calls list
        await fetchCalls();
        return comment;
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
}

// Dropdown options management
async function fetchDropdownOptions() {
    try {
        const options = await apiCall('/users/dropdown-options');
        populateDropdown(personToContactOptions, options.contactPersons, 'person');
        populateDropdown(operatorNameOptions, options.operators, 'operator');
    } catch (error) {
        console.error('Error fetching dropdown options:', error);
    }
}

async function addDropdownOption(type, name) {
    try {
        const endpoint = type === 'person' ? '/users/contact-persons' : '/users/operators';
        await apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        
        // Refresh dropdown options
        await fetchDropdownOptions();
    } catch (error) {
        console.error(`Error adding ${type}:`, error);
        throw error;
    }
}

async function deleteDropdownOption(type, name) {
    try {
        const endpoint = type === 'person' ? `/users/contact-persons/${encodeURIComponent(name)}` : `/users/operators/${encodeURIComponent(name)}`;
        await apiCall(endpoint, {
            method: 'DELETE'
        });
        
        // Refresh dropdown options
        await fetchDropdownOptions();
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        throw error;
    }
}

// UI functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${
        type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

function populateDropdown(optionsContainer, options, type) {
    optionsContainer.innerHTML = '';
    
    options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'dropdown-option';
        optionDiv.setAttribute('data-value', option);
        optionDiv.setAttribute('data-type', type);
        
        optionDiv.innerHTML = `
            <span class="dropdown-option-text">${option}</span>
            <button class="dropdown-delete-btn" data-value="${option}" data-type="${type}" title="Delete ${option}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        optionsContainer.appendChild(optionDiv);
    });
}

function renderCallLog(calls) {
    const callLogBody = document.getElementById('ct-call-log-body');
    callLogBody.innerHTML = '';
    
    calls.forEach(call => {
        const tr = document.createElement('tr');
        const createdAt = new Date(call.created_at);
        const responseTime = Math.floor((new Date() - createdAt) / (1000 * 60)); // minutes
        
        // Priority styling
        let priorityClass = '';
        if (call.priority === 'Urgent') priorityClass = 'bg-red-100 text-red-800';
        else if (call.priority === 'High') priorityClass = 'bg-orange-100 text-orange-800';
        else if (call.priority === 'Medium') priorityClass = 'bg-yellow-100 text-yellow-800';
        else priorityClass = 'bg-gray-100 text-gray-800';
        
        tr.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${call.caller_name}</div>
                <div class="text-sm text-gray-500">${call.caller_number}</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${call.person_to_contact}</div>
                <div class="text-sm text-gray-500">Operator: ${call.operator_name}</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClass}">
                    ${call.priority}
                </span>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="text-sm font-medium text-gray-900">${createdAt.toLocaleDateString()}</div>
                <div class="text-xs text-gray-500">${createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                ${responseTime < 60 ? responseTime + 'm' : Math.floor(responseTime/60) + 'h ' + (responseTime%60) + 'm'}
            </td>
            <td class="px-4 py-4 text-sm text-gray-500 max-w-xs">
                <div class="mb-2">
                    <div class="text-sm text-gray-700">${call.note || 'No note'}</div>
                </div>
                <div class="flex items-center gap-2">
                    <button data-id="${call.id}" class="comment-btn px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none">
                        Add Comment (${call.comment_history ? call.comment_history.length : '0'})
                    </button>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    call.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                    call.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                    call.status === 'Not Received Call' ? 'bg-red-100 text-red-800' :
                    call.status === 'Followed Up' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                }">
                    ${call.status}
                </span>
                <div class="mt-1">
                    <select data-id="${call.id}" class="status-dropdown px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="Pending" ${call.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Followed Up" ${call.status === 'Followed Up' ? 'selected' : ''}>Follow Up</option>
                        <option value="Not Received Call" ${call.status === 'Not Received Call' ? 'selected' : ''}>Not Answered</option>
                        <option value="Completed" ${call.status === 'Completed' ? 'selected' : ''}>Complete</option>
                    </select>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-id="${call.id}" class="text-red-600 hover:text-red-900 delete-btn">Delete</button>
            </td>
        `;
        
        callLogBody.appendChild(tr);
    });
}

function updateStatusCards(calls) {
    const active = calls.filter(call => call.status === 'Active').length;
    const pending = calls.filter(call => call.status === 'Pending').length;
    const followedUp = calls.filter(call => call.status === 'Followed Up').length;
    const notReceived = calls.filter(call => call.status === 'Not Received Call').length;
    const completed = calls.filter(call => call.status === 'Completed').length;
    
    document.getElementById('active-count').textContent = active;
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('followed-up-count').textContent = followedUp;
    document.getElementById('not-received-count').textContent = notReceived;
    document.getElementById('completed-count').textContent = completed;
}

function filterCalls() {
    const searchTerm = document.querySelector('input[placeholder*="Search calls"]').value.toLowerCase();
    const dateRange = document.getElementById('date-range').value;
    
    filteredCalls = allCalls.filter(call => {
        // Search filter
        const matchesSearch = !searchTerm || 
            call.caller_name.toLowerCase().includes(searchTerm) ||
            call.caller_number.includes(searchTerm) ||
            (call.note && call.note.toLowerCase().includes(searchTerm));
        
        // Date filter
        let matchesDate = true;
        if (dateRange !== 'All Time') {
            const callDate = new Date(call.created_at);
            const now = new Date();
            
            switch(dateRange) {
                case 'Today':
                    matchesDate = callDate.toDateString() === now.toDateString();
                    break;
                case 'This Week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    matchesDate = callDate >= weekAgo;
                    break;
                case 'This Month':
                    matchesDate = callDate.getMonth() === now.getMonth() && callDate.getFullYear() === now.getFullYear();
                    break;
            }
        }
        
        return matchesSearch && matchesDate;
    });
    
    renderCallLog(filteredCalls);
    updateStatusCards(allCalls);
}

function filterByStatus(status) {
    // Clear other filters
    document.querySelector('input[placeholder*="Search calls"]').value = '';
    document.getElementById('date-range').value = 'All Time';
    
    // Remove active class from quick filter buttons
    document.querySelectorAll('.px-4.py-1.rounded-full').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-50', 'text-gray-600');
    });
    
    // Remove active class from all status cards
    document.querySelectorAll('.status-card').forEach(card => {
        card.classList.remove('ring-2', 'ring-indigo-500');
    });
    
    if (status === 'All') {
        filteredCalls = [...allCalls];
    } else {
        filteredCalls = allCalls.filter(call => call.status === status);
        // Add active styling to clicked card
        document.querySelector(`[data-status="${status}"]`).classList.add('ring-2', 'ring-indigo-500');
    }
    
    renderCallLog(filteredCalls);
    updateStatusCards(allCalls); // Always show total counts
}

function setupDropdownEvents() {
    // Person dropdown events
    const personToContactInput = document.getElementById('ct-person-to-contact');
    const personToContactOptions = document.getElementById('ct-person-options');
    
    personToContactInput.addEventListener('click', () => {
        closeAllDropdowns();
        personToContactOptions.classList.add('show');
    });
    
    // Operator dropdown events
    const operatorNameInput = document.getElementById('ct-operator-name');
    const operatorNameOptions = document.getElementById('ct-operator-options');
    
    operatorNameInput.addEventListener('click', () => {
        closeAllDropdowns();
        operatorNameOptions.classList.add('show');
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown-container')) {
            closeAllDropdowns();
        }
    });
    
    // Handle option selection and deletion
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('dropdown-option') || e.target.closest('.dropdown-option')) {
            const option = e.target.closest('.dropdown-option');
            const value = option.dataset.value;
            const type = option.dataset.type;
            
            if (e.target.classList.contains('dropdown-delete-btn') || e.target.closest('.dropdown-delete-btn')) {
                e.stopPropagation();
                try {
                    await deleteDropdownOption(type, value);
                    showNotification(`${type} deleted successfully`, 'success');
                } catch (error) {
                    showNotification(`Error deleting ${type}`, 'error');
                }
            } else {
                // Select the option
                const inputElement = type === 'person' ? personToContactInput : operatorNameInput;
                inputElement.value = value;
                closeAllDropdowns();
                
                // Update selected styling
                option.parentElement.querySelectorAll('.dropdown-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
            }
        }
    });
}

function closeAllDropdowns() {
    document.getElementById('ct-person-options').classList.remove('show');
    document.getElementById('ct-operator-options').classList.remove('show');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already authenticated
    if (checkAuth()) {
        showMainApp();
    } else {
        showAuthModal();
    }
    
    // Auth form event listeners
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const data = await login(username, password);
            setAuth(data.token, data.user);
            showMainApp();
            showNotification('Login successful!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
    
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const data = await register(username, email, password);
            setAuth(data.token, data.user);
            showMainApp();
            showNotification('Registration successful!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
    
    // Auth tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active form
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            document.getElementById(`${tabName}Form`).classList.add('active');
        });
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        clearAuth();
        showAuthModal();
        showNotification('Logged out successfully', 'info');
    });
    
    // Add call form
    document.getElementById('ct-add-call-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            callerName: document.getElementById('ct-caller-name').value,
            callerNumber: document.getElementById('ct-caller-number').value,
            personToContact: document.getElementById('ct-person-to-contact').value,
            operatorName: document.getElementById('ct-operator-name').value,
            priority: document.getElementById('ct-priority').value,
            note: document.getElementById('ct-call-note').value
        };
        
        try {
            await createCall(formData);
            document.getElementById('ct-add-call-form').reset();
            showNotification('Call added successfully!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
    
    // Add person/operator buttons
    document.getElementById('add-person-btn').addEventListener('click', async () => {
        const name = prompt('Enter person name:');
        if (name && name.trim()) {
            try {
                await addDropdownOption('person', name.trim());
                showNotification('Person added successfully!', 'success');
            } catch (error) {
                showNotification(error.message, 'error');
            }
        }
    });
    
    document.getElementById('add-operator-btn').addEventListener('click', async () => {
        const name = prompt('Enter operator name:');
        if (name && name.trim()) {
            try {
                await addDropdownOption('operator', name.trim());
                showNotification('Operator added successfully!', 'success');
            } catch (error) {
                showNotification(error.message, 'error');
            }
        }
    });
    
    // Call log event listeners
    document.getElementById('ct-call-log-body').addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this call?')) {
                try {
                    await deleteCall(id);
                    showNotification('Call deleted successfully!', 'success');
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        }
    });
    
    // Status dropdown changes
    document.getElementById('ct-call-log-body').addEventListener('change', async (e) => {
        if (e.target.classList.contains('status-dropdown')) {
            const id = e.target.dataset.id;
            const newStatus = e.target.value;
            
            try {
                await updateCallStatus(id, newStatus);
                showNotification('Status updated successfully!', 'success');
            } catch (error) {
                showNotification(error.message, 'error');
            }
        }
    });
    
    // Search and filter functionality
    document.querySelector('input[placeholder*="Search calls"]').addEventListener('input', filterCalls);
    document.getElementById('date-range').addEventListener('change', filterCalls);
    
    // Status card click event listeners
    document.querySelectorAll('.status-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const status = e.currentTarget.dataset.status;
            filterByStatus(status);
        });
    });
    
    // Quick filter buttons
    document.querySelectorAll('.px-4.py-1.rounded-full').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const buttonText = e.target.textContent;
            
            // Remove active class from all buttons
            document.querySelectorAll('.px-4.py-1.rounded-full').forEach(b => {
                b.classList.remove('active', 'bg-indigo-600', 'text-white');
                b.classList.add('bg-gray-50', 'text-gray-600');
            });
            
            if (buttonText === 'Clear Filters') {
                filteredCalls = [...allCalls];
                document.querySelector('input[placeholder*="Search calls"]').value = '';
                document.getElementById('date-range').value = 'All Time';
                // Remove active styling from status cards
                document.querySelectorAll('.status-card').forEach(card => {
                    card.classList.remove('ring-2', 'ring-indigo-500');
                });
            } else {
                // Add active class to clicked button
                e.target.classList.add('active', 'bg-indigo-600', 'text-white');
                e.target.classList.remove('bg-gray-50', 'text-gray-600');
                
                if (buttonText === "Today's Calls") {
                    const today = new Date().toDateString();
                    filteredCalls = allCalls.filter(call => {
                        const callDate = new Date(call.created_at);
                        return callDate.toDateString() === today;
                    });
                } else if (buttonText === 'Urgent') {
                    filteredCalls = allCalls.filter(call => call.priority === 'Urgent');
                } else if (buttonText === 'Overdue Follow-ups') {
                    const now = new Date();
                    filteredCalls = allCalls.filter(call => {
                        const followUpDate = call.follow_up_date ? new Date(call.follow_up_date) : null;
                        return followUpDate && followUpDate < now && call.status !== 'Completed';
                    });
                }
            }
            
            renderCallLog(filteredCalls);
            updateStatusCards(allCalls);
        });
    });
});

function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('userDisplayName').textContent = currentUser.username;
    
    // Initialize app
    setupDropdownEvents();
    fetchDropdownOptions();
    fetchCalls();
}
