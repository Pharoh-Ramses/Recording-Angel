// View switching functionality
function switchView(viewId) {
    // Hide all views
    document.getElementById('audience-view-desktop').style.display = 'none';
    document.getElementById('audience-view-mobile').style.display = 'none';
    document.getElementById('speaker-view').style.display = 'none';
    document.getElementById('admin-view').style.display = 'none';
    document.getElementById('stake-president-view').style.display = 'none';
    document.getElementById('bishop-view').style.display = 'none';
    
    // Show selected view
    document.getElementById(viewId).style.display = 'block';
}

// Tab functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers for admin tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            this.parentElement.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
            });
            // Add active class to clicked tab
            this.classList.add('active');
        });
    });

    // Scripture reference handling
    document.querySelectorAll('.scripture-reference').forEach(reference => {
        reference.addEventListener('click', function(e) {
            e.preventDefault();
            const referenceText = this.getAttribute('data-reference');
            const scriptureText = this.getAttribute('data-text');
            
            document.getElementById('scripture-reference-title').textContent = referenceText;
            document.getElementById('scripture-reference-text').textContent = scriptureText;
            document.getElementById('scripture-modal').style.display = 'flex';
        });
    });

    // Close modal functionality
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal-overlay').style.display = 'none';
        });
    });

    // Star functionality
    document.querySelectorAll('.star-btn').forEach(button => {
        button.addEventListener('click', function() {
            this.classList.toggle('starred');
            const countElement = this.querySelector('.star-count');
            let count = parseInt(countElement.textContent);
            
            if (this.classList.contains('starred')) {
                count += 1;
            } else {
                count = Math.max(0, count - 1);
            }
            
            countElement.textContent = count;
        });
    });

    // Mobile Bottom Navigation and Drawers
    if (document.getElementById('announcements-nav')) {
        document.getElementById('announcements-nav').addEventListener('click', function() {
            toggleDrawer('announcements-drawer');
        });
    }
    
    if (document.getElementById('hymns-nav')) {
        document.getElementById('hymns-nav').addEventListener('click', function() {
            toggleDrawer('hymns-drawer');
        });
    }
    
    if (document.getElementById('transcript-nav')) {
        document.getElementById('transcript-nav').addEventListener('click', function() {
            closeAllDrawers();
        });
    }
    
    if (document.getElementById('close-announcements-drawer')) {
        document.getElementById('close-announcements-drawer').addEventListener('click', function() {
            closeDrawer('announcements-drawer');
        });
    }
    
    if (document.getElementById('close-hymns-drawer')) {
        document.getElementById('close-hymns-drawer').addEventListener('click', function() {
            closeDrawer('hymns-drawer');
        });
    }
});

// Mobile drawer functions
function toggleDrawer(drawerId) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) return;
    
    const isOpen = drawer.style.maxHeight !== '0px' && drawer.style.maxHeight !== '';
    
    // Close all drawers first
    closeAllDrawers();
    
    // Then open the selected drawer if it was closed
    if (!isOpen) {
        drawer.style.maxHeight = '50vh';
    }
}

function closeDrawer(drawerId) {
    const drawer = document.getElementById(drawerId);
    if (drawer) {
        drawer.style.maxHeight = '0px';
    }
}

function closeAllDrawers() {
    document.querySelectorAll('.mobile-drawer').forEach(drawer => {
        drawer.style.maxHeight = '0px';
    });
} 