// delivery-dashboard/js/user-management.js
(function() {
    'use strict';

    let usersData = [];

    window.initUserManagement = async function() {
        usersData = await DataLoader.getUsers();
        renderUserTable(usersData);
        document.getElementById('add-user-btn')?.addEventListener('click', openAddUserModal);
        document.getElementById('user-form')?.addEventListener('submit', handleUserFormSubmit);
    };

    function renderUserTable(users) {
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.userId}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td><span class="role-badge">${user.role}</span></td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td class="actions-cell">
                    <button class="btn-secondary edit-user" data-id="${user.userId}">Edit</button>
                    <button class="btn-danger delete-user" data-id="${user.userId}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        // Attach event listeners
        document.querySelectorAll('.edit-user').forEach(btn => btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const user = usersData.find(u => u.userId === id);
            if (user) openEditUserModal(user);
        }));
        document.querySelectorAll('.delete-user').forEach(btn => btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            deleteUser(id);
        }));
    }

    function openAddUserModal() {
        const modal = document.getElementById('user-form-modal');
        const form = document.getElementById('user-form');
        document.getElementById('user-form-title').textContent = 'Add New User';
        form.reset();
        form.dataset.mode = 'add';
        modal.classList.remove('hidden');
        form.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>First Name</label><input type="text" name="firstName" required>
                </div>
                <div class="form-group">
                    <label>Last Name</label><input type="text" name="lastName" required>
                </div>
            </div>
            <div class="form-group">
                <label>Email</label><input type="email" name="email" required>
            </div>
            <div class="form-group">
                <label>Phone</label><input type="text" name="phone">
            </div>
            <div class="form-group">
                <label>Role</label>
                <select name="role" required>
                    <option value="">Select role</option>
                    <option value="super-admin">Super Admin</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="delivery-man">Delivery Man</option>
                    <option value="customer">Customer</option>
                </select>
            </div>
            <div class="form-group">
                <label>Password</label><input type="password" name="password" required>
            </div>
            <button type="submit" class="btn-primary">Save User</button>
        `;
    }

    function openEditUserModal(user) {
        const modal = document.getElementById('user-form-modal');
        const form = document.getElementById('user-form');
        document.getElementById('user-form-title').textContent = 'Edit User';
        form.dataset.mode = 'edit';
        form.dataset.userId = user.userId;
        modal.classList.remove('hidden');
        form.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>First Name</label><input type="text" name="firstName" value="${user.firstName}" required>
                </div>
                <div class="form-group">
                    <label>Last Name</label><input type="text" name="lastName" value="${user.lastName}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Email</label><input type="email" name="email" value="${user.email}" required>
            </div>
            <div class="form-group">
                <label>Phone</label><input type="text" name="phone" value="${user.phone}">
            </div>
            <div class="form-group">
                <label>Role</label>
                <select name="role" required>
                    <option value="super-admin" ${user.role==='super-admin'?'selected':''}>Super Admin</option>
                    <option value="dispatcher" ${user.role==='dispatcher'?'selected':''}>Dispatcher</option>
                    <option value="delivery-man" ${user.role==='delivery-man'?'selected':''}>Delivery Man</option>
                    <option value="customer" ${user.role==='customer'?'selected':''}>Customer</option>
                </select>
            </div>
            <div class="form-group">
                <label>New Password (leave blank to keep)</label><input type="password" name="password">
            </div>
            <button type="submit" class="btn-primary">Update User</button>
        `;
    }

    function handleUserFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const mode = form.dataset.mode;
        const userId = form.dataset.userId || `usr_${Date.now()}`;
        const newUser = {
            userId: userId,
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: formData.get('role'),
            password: formData.get('password') || (mode === 'edit' ? usersData.find(u => u.userId === userId)?.password : ''),
            profileImageUrl: `https://i.pravatar.cc/150?u=${userId}`
        };
        if (mode === 'add') {
            usersData.push(newUser);
        } else {
            const idx = usersData.findIndex(u => u.userId === userId);
            if (idx !== -1) usersData[idx] = newUser;
        }
        // Persist to localStorage
        localStorage.setItem('users_modified', JSON.stringify(usersData));
        document.getElementById('user-form-modal').classList.add('hidden');
        renderUserTable(usersData);
    }

    function deleteUser(userId) {
        if (!confirm('Delete this user?')) return;
        usersData = usersData.filter(u => u.userId !== userId);
        localStorage.setItem('users_modified', JSON.stringify(usersData));
        renderUserTable(usersData);
    }

    // Override DataLoader.getUsers to check localStorage
    const originalGetUsers = DataLoader.getUsers;
    DataLoader.getUsers = async function() {
        const local = localStorage.getItem('users_modified');
        if (local) return JSON.parse(local);
        return originalGetUsers();
    };
})();
