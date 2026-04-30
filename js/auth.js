// delivery-dashboard/js/auth.js
function authenticate(role, email, password) {
    return fetch('data/users.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load user database');
            return response.json();
        })
        .then(users => {
            const user = users.find(u => 
                u.role === role &&
                u.email.toLowerCase() === email.toLowerCase() &&
                u.password === password
            );
            if (!user) {
                throw new Error('Invalid credentials. Please check your role, email, and password.');
            }
            // Store session
            const session = {
                userId: user.userId,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                avatar: user.profileImageUrl || `https://i.pravatar.cc/150?u=${user.userId}`
            };
            localStorage.setItem('currentUser', JSON.stringify(session));
            // Redirect based on role
            const rolePages = {
                'super-admin': 'super-admin.html',
                'dispatcher': 'dispatcher.html',
                'delivery-man': 'delivery-man.html',
                'customer': 'customer.html'
            };
            const page = rolePages[role];
            if (page) {
                window.location.href = page;
            } else {
                throw new Error('Unknown role');
            }
        })
        .catch(err => {
            console.error('Auth error:', err);
            throw err;
        });
}

function getCurrentUser() {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
}

function logout() {
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    window.location.href = 'index.html';
}
