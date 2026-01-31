/**
 * CT-CharLibraryColumnView
 * Enhances SillyTavern character library with two-column layout and clean descriptions
 */

(function () {
    'use strict';

    const MODULE_NAME = 'CT-CharLibraryColumnView';
    let descriptionObserver = null;
    let panelObserver = null;

    /**
     * Clean HTML content from character descriptions
     */
    function cleanDescription(html) {
        // First, decode HTML entities
        let decoded = $('<textarea/>').html(html).val();
        
        // Remove style tags and their content entirely
        decoded = decoded.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        
        // Remove script tags and their content
        decoded = decoded.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        
        // Remove HTML comments
        decoded = decoded.replace(/<!--[\s\S]*?-->/g, '');
        
        // Remove any elements that are purely decorative (fog layers, animations, etc)
        // Target divs with position absolute/fixed and animation/opacity styles
        decoded = decoded.replace(/<div[^>]*(?:position:\s*(?:absolute|fixed)|animation:|opacity:\s*0)[^>]*>[\s\S]*?<\/div>/gi, '');
        
        // Remove empty divs that might be used for styling
        decoded = decoded.replace(/<div[^>]*>\s*<\/div>/gi, '');
        
        // Handle special formatting tags before general conversion
        // Preserve headers with proper spacing
        decoded = decoded.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n$1\n\n');
        
        // Handle paragraphs with proper spacing
        decoded = decoded.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
        
        // Handle list items
        decoded = decoded.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n');
        
        // Handle spans (often used for inline styling) - just extract content
        decoded = decoded.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
        
        // Handle divs (extract content with spacing)
        decoded = decoded.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n');
        
        // Convert line breaks
        decoded = decoded.replace(/<br\s*\/?>/gi, '\n');
        
        // Handle strong/bold tags
        decoded = decoded.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '$1');
        
        // Handle em/italic tags
        decoded = decoded.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '$1');
        
        // Remove any remaining HTML tags
        decoded = decoded.replace(/<[^>]+>/g, '');
        
        // Decode HTML entities that might remain
        let text = $('<div/>').html(decoded).text();
        
        // Clean up text content
        text = text
            // Remove URLs and image markdown
            .replace(/!\[.*?\]\((?:https?:\/\/\S+)\)|https?:\/\/\S+/gi, '')
            // Remove markdown-style separators
            .replace(/^\s*[-_~=*\\/]{3,}\s*$/gm, '')
            // Remove single character separators
            .replace(/^\s*[._*~⋯-]\s*$/gm, '')
            // Remove animation class references that might leak through
            .replace(/\b(?:fog-drift|signal-pulse|static-item|signal-text)\b/gi, '')
            // Clean up excessive whitespace
            .replace(/[ \t]+/g, ' ')
            // Normalize line breaks
            .replace(/\n{3,}/g, '\n\n')
            // Remove leading/trailing whitespace from lines
            .replace(/^[ \t]+|[ \t]+$/gm, '')
            // Final trim
            .trim();
        
        return text;
    }

    /**
     * Process all character descriptions
     */
    function processDescriptions() {
        $('.ch_description').each(function() {
            const $this = $(this);
            // Always check if the content has HTML tags
            const content = $this.html();
            if (content && (content.includes('<') || content.includes('&lt;'))) {
                const cleanText = cleanDescription(content);
                $this.text(cleanText);
            }
        });
    }

    /**
     * Sync right nav panel with sheld panel dynamically
     */
    function syncRightNavPanel() {
        const $sheld = $('#sheld');
        const $rightNav = $('#right-nav-panel');
        
        if ($sheld.length && $rightNav.length && $sheld.is(':visible')) {
            // Get sheld's computed position and dimensions
            const sheldRect = $sheld[0].getBoundingClientRect();
            
            // Apply matching position to right nav panel
            $rightNav.css({
                'width': sheldRect.width + 'px',
                'left': sheldRect.left + 'px',
                'top': sheldRect.top + 'px',
                'position': 'fixed'
            });
        }
    }

    /**
     * Initialize description cleaner observer
     */
    function initDescriptionObserver() {
        // Disconnect existing observer if any
        if (descriptionObserver) {
            descriptionObserver.disconnect();
        }

        const container = document.querySelector('#rm_print_characters_block');
        if (!container) return;

        // Create observer that watches for any changes
        descriptionObserver = new MutationObserver((mutations) => {
            // Process descriptions on any change
            processDescriptions();
        });

        // Observe with aggressive settings
        descriptionObserver.observe(container, { 
            childList: true, 
            subtree: true,
            characterData: true,
            attributes: false  // Don't watch attributes to avoid loops
        });
    }

    /**
     * Initialize panel sync observer
     */
    function initPanelObserver() {
        const $rightNav = $('#right-nav-panel');
        if (!$rightNav.length || panelObserver) return;

        panelObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-menu-type') {
                    setTimeout(syncRightNavPanel, 50);
                }
            }
        });

        panelObserver.observe($rightNav[0], { 
            attributes: true,
            attributeFilter: ['data-menu-type', 'style', 'class']
        });

        syncRightNavPanel();
    }

    /**
     * Initialize the extension
     */
    function init() {
        // Clean existing descriptions
        processDescriptions();
        
        // Initialize observers
        initDescriptionObserver();
        initPanelObserver();
        syncRightNavPanel();
    }

    // Initialize when DOM is ready
    jQuery(() => {
        const { eventSource, event_types } = SillyTavern.getContext();
        
        // Listen for character list being shown
        eventSource.on(event_types.CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER, (state) => {
            if (state) {
                setTimeout(() => {
                    init();
                    // Extra process after delay to catch late renders
                    setTimeout(processDescriptions, 500);
                }, 100);
            }
        });

        // Listen for settings updates
        eventSource.on(event_types.SETTINGS_UPDATED, () => {
            setTimeout(syncRightNavPanel, 50);
        });

        // Listen for character edits being closed (returning to list)
        eventSource.on(event_types.CHARACTER_EDITED, () => {
            setTimeout(init, 200);
        });
        
        // Watch for navigation clicks
        $(document).on('click', '#rm_button_characters, #rm_button_back, #rm_button_back_from_group', () => {
            setTimeout(() => {
                init();
                // Extra process after delay
                setTimeout(processDescriptions, 300);
            }, 100);
        });

        // Watch for character selection (entering edit mode)
        $(document).on('click', '.character_select', () => {
            setTimeout(syncRightNavPanel, 100);
        });

        // Global observer for panel visibility
        const globalObserver = new MutationObserver(() => {
            const $panel = $('#right-nav-panel');
            const $charBlock = $('#rm_print_characters_block');
            
            if ($panel.is(':visible')) {
                syncRightNavPanel();
            }
            
            if ($charBlock.is(':visible') && $charBlock.children().length > 0) {
                processDescriptions();
            }
        });

        // Observe body for major changes
        globalObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        
        // Window resize handler
        $(window).on('resize', syncRightNavPanel);
        
        // Initial setup with delay
        setTimeout(() => {
            if ($('#right-nav-panel').is(':visible')) {
                init();
            }
        }, 500);
        
        console.log(`[${MODULE_NAME}] Extension loaded`);
    });
})();