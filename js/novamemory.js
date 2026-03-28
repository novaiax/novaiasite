/* ============================================
   MémoireGPT — Main Script
   ============================================ */

(function() {
    'use strict';

    // --- Mobile Nav Toggle ---
    const burger = document.getElementById('navBurger');
    const navLinks = document.getElementById('navLinks');

    if (burger && navLinks) {
        burger.addEventListener('click', function() {
            burger.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        // Close nav on link click
        navLinks.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                burger.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // --- Scroll Animations ---
    var animatedElements = document.querySelectorAll('[data-animate]');

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(function(el) {
            observer.observe(el);
        });
    } else {
        // Fallback: show all
        animatedElements.forEach(function(el) {
            el.classList.add('visible');
        });
    }

    // --- Stagger Animation Delay ---
    var grids = document.querySelectorAll('.problem-grid, .agents-grid, .usecases-grid');
    grids.forEach(function(grid) {
        var cards = grid.querySelectorAll('[data-animate]');
        cards.forEach(function(card, i) {
            card.style.transitionDelay = (i * 0.1) + 's';
        });
    });

    // --- Nav Background on Scroll ---
    var nav = document.getElementById('nav');
    if (nav) {
        var lastScroll = 0;
        window.addEventListener('scroll', function() {
            var scrollY = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollY > 80) {
                nav.style.borderBottomColor = 'rgba(34, 34, 34, 0.8)';
                nav.style.background = 'rgba(10, 10, 10, 0.95)';
            } else {
                nav.style.borderBottomColor = '';
                nav.style.background = '';
            }
            lastScroll = scrollY;
        }, { passive: true });
    }

    // --- FAQ Accordion ---
    var faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(function(item) {
        var question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', function() {
                var isActive = item.classList.contains('active');

                // Close all
                faqItems.forEach(function(faq) {
                    faq.classList.remove('active');
                    var btn = faq.querySelector('.faq-question');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });

                // Toggle current
                if (!isActive) {
                    item.classList.add('active');
                    question.setAttribute('aria-expanded', 'true');
                }
            });
        }
    });

    // --- Smooth Scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;
            var target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                var navHeight = nav ? nav.offsetHeight : 0;
                var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- Terminal Typing Effect ---
    var terminalLines = document.querySelectorAll('.terminal-line');
    if (terminalLines.length > 0) {
        var termObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    terminalLines.forEach(function(line, i) {
                        line.style.opacity = '0';
                        line.style.transform = 'translateY(10px)';
                        line.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        setTimeout(function() {
                            line.style.opacity = '1';
                            line.style.transform = 'translateY(0)';
                        }, 300 + (i * 600));
                    });
                    termObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        var terminal = document.querySelector('.hero-terminal');
        if (terminal) termObserver.observe(terminal);
    }

    // --- Waitlist Form ---
    var form = document.getElementById('waitlistForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var btn = form.querySelector('button[type="submit"]');
            if (btn) {
                btn.textContent = 'Envoi en cours...';
                btn.style.opacity = '0.7';
                btn.style.pointerEvents = 'none';
            }

            fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            }).then(function(response) {
                if (response.ok) {
                    form.innerHTML = '<div style="text-align:center;padding:2rem 0;">' +
                        '<p style="font-size:1.3rem;font-weight:600;color:#fff;margin-bottom:1rem;">Merci, c\'est envoyé !</p>' +
                        '<p style="color:rgba(255,255,255,0.7);margin-bottom:1.5rem;">On vous recontacte très vite.</p>' +
                        '<a href="https://discord.gg/eVxQWU3EYX" target="_blank" rel="noopener" ' +
                        'style="display:inline-block;padding:0.8rem 2rem;background:#5865F2;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">' +
                        'Rejoindre le Discord</a>' +
                        '<p style="color:rgba(255,255,255,0.5);margin-top:1rem;font-size:0.85rem;">N\'oubliez pas de rejoindre le Discord pour suivre l\'avancement !</p>' +
                        '</div>';
                } else {
                    if (btn) {
                        btn.textContent = 'Erreur, réessayez';
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = '';
                    }
                }
            }).catch(function() {
                if (btn) {
                    btn.textContent = 'Erreur, réessayez';
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = '';
                }
            });
        });
    }

})();
