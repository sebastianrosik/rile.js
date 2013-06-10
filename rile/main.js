;(function(global) {
	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//                                                                                                  //
	//  STATIC                                                                                          //
	//  -------                                                                                         //
	//  Declarations of static variable                                                                 //
	//                                                                                                  //
	//////////////////////////////////////////////////////////////////////////////////////////////////////


	/**
	Location of the container.xml file in the EPUB document.

	@property CONTAINER_XML
	@static
	@type String
	@default 'META-INF/container.xml'
	**/
	var CONTAINER_XML = 'META-INF/container.xml';


	/**
	The standard epub 1.2 and earlier directory.

	@property OEBPS
	@static
	@type String
	@default 'OEBPS/'
	**/
	var OEBPS = 'OEBPS/'


	/**
	The standard epub directory.

	@property EPUB
	@static
	@type String
	@default 'EPUB/'
	**/
	var EPUB = 'EPUB/';


	/**
	The standard epub directory.

	@property OPS
	@static
	@type String
	@default 'OPS/'
	**/
	var OPS = 'OPS/';



	/** 
	nodeType value

	@property NODE
	@static
	@type Number
	@default 1
	**/
	var NODE = 1;


	/**
	nodeType value for text nodes.

	@property TEXT
	@static
	@type Number
	@default 3
	**/
	var TEXT = 3;


	/**
	@property DEFAULT_THEME
	@static
	@type String
	@default 'light'
	**/
	var DEFAULT_THEME = 'light';


	/**
	@property DEFAULT_FONT_SIZE
	@static
	@type String
	@default 'medium'
	**/
	var DEFAULT_FONT_SIZE = 'medium';



	/**
	@property FONT_SIZES
	@static
	@type Object
	**/
	var FONT_SIZES = {
		small  : '0.75em', 
		medium : '1em',
		large  : '2em'
	}


	/**
	Array of string with theme names used in the application.

	@property THEMES
	@static
	@type Array
	**/
	var THEMES = ['light', 'gray', 'sepia', 'dark', 'black', 'black2'];


	

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//                                                                                                  //
	//  RILE                                                                                            //
	//  -------                                                                                         //
	//  The heart of the project. Main Class of rile.js.                                                //
	//                                                                                                  //
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	@class Rile
	@param embed_el {Element}
	**/
	var Rile = function( embed_el ) {
		this.id     = Math.round( Math.random() * 100000 ).toString(16);
		this.viewer = replaceWithViewer( embed_el );
		this.url    = this.viewer.getAttribute('data-epub');


    	/**
    	Total count of subpages in the document.

		@property total_subpages
		@type Number
		@default 0
    	**/
 		this.total_subpages = 0;
 		

 		/**
		Array of pages. Every page is an Array of subpages that are prerendered HTML elements.
 		
 		@property pages
		@type Array
		@default []
 		**/
 		this.pages = [];


 		/**
		@property pages_currently_rendered
 		@type Array
		@default []
 		**/
 		this.pages_currently_rendered = [];
 		

 		/**
		@property xmldocs
		@type Array
		@default []
 		**/
 		this.xmldocs = [];
 		

 		/**	
		Meta information pulled from the EPUB document.

		@property meta
		@type Object
		@default {}
 		**/
 		this.meta = {};

	}


	Rile.prototype = {

		/**
		Default font size
		
		@property font_size
		@type String
		@default 'medium'
		**/
		font_size : 'medium',


		/**
		Default color theme

		@property theme
		@type String
		@default 'light'
		**/
		theme : 'light',


		/**
		Holds the file entries for the ZIP reader.

		@property zip_file_entries
		@type Array
		@default null
		**/
 		zip_file_entries : null,	
    	

 		/**
		The HTML viewer that holds all the GUI controls and the parsed document.

		@property viewer
		@type Element
		@default null
 		**/
    	viewer : null,


    	/**
		Current page that is displayed. 0-N are pages and subpages. -1 is for cover.
		@property current_subpage
		@type Number
		@default 0		
    	**/
    	current_subpage : 0,


 		/**
		Are any pages currently being read and rendered?

		@property rendering_in_progress
		@type Boolean
		@default false
 		**/
 		rendering_in_progress : false,



 		/**
 		Tells us if the fullscreen event comes from our document.
		If there are multiple Rile.js instances on one page, then 
		every one of them will get the fullscreen event, therefore 
		we need to know from which document the action comes, only 
		the CHOSEN ONE will have this property set to true.

 		@property _fullscreen_requested
 		@type Boolean
 		@default false
		@private
 		**/
 		_fullscreen_requested : false,



		/**
		Gets an EPUB file located under given URL and reads it.

		@method process
		@param url {String} URL of the epub file
		**/
		process : function() {
			// Note to my future self:
			// Go to hell for making this mess here, fix it.
			var self = this;

			this.showSpinner();
			
			zip.createReader( new zip.HttpReader( this.url ), function( reader ){

				reader.getEntries(function( zip_file_entries ) {
				    if ( zip_file_entries.length ) {
					 	self.zip_file_entries = zip_file_entries;

					    self.extractEPUBContentList( function( content ){
					    	self.readMetaData( content );
					    	self.hideAllPages();
					    	self.generateSpineItems( content, function( xml_documents ){

					    		var total = xml_documents.length,
					    			ready = 0;

					    		$each( xml_documents, function( xml_doc, index ){
					    			self.renderImages( xml_doc, function(){
					    				self.fixStyles( xml_doc, function(){
					    					self.savePage( xml_doc, index );
					    					ready++;
								    		if ( total <= ready ) {
									    		self.renderPages(function(){
													self.showPage(0);
													self.displayTitle();
													self.updateCurrentReadingPosition();
												});
								    		}
					    				});
					    			});
					    		});
					    	});

							reader.close();
					    });
					}
				});
			});
		},


		/**
		Changes current page to one page forward.

		@method nextPage
		**/
		nextPage : function(){
			this.changePage(1)
		},


		/**
		Changes current page to one page backward.

		@method prevPage
		**/
		prevPage : function(){
			this.changePage(-1);
		},


		/**
		@method changePage
		@param direction {Number}
		**/
		changePage : function( direction ) {
			var direction = direction || 1;

			this.current_subpage += direction;

			if ( direction > 0 && this.current_subpage > this.total_subpages ) {
				this.current_subpage = this.total_subpages;
			
			} else if ( direction < 0 && this.current_subpage < 0 ) {
				this.current_subpage = 0;
			
			}
			
			this.showPage( this.current_subpage );
		},


		/**
		Checks if fullscreen is currently on.

		@method isFullscreen
		@return {Boolean}
		**/
		isFullscreen : function(){
			return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
		},


		/**
		Toggles the fullscreen state of the application.

		@method toggleFullScreen
		**/
		toggleFullScreen : function(){
			this._fullscreen_requested = true;

			if ( !this.isFullscreen() ) {  // current working methods
				if (document.documentElement.requestFullscreen) {
					document.documentElement.requestFullscreen();
				} else if (document.documentElement.mozRequestFullScreen) {
					document.documentElement.mozRequestFullScreen();
				} else if (document.documentElement.webkitRequestFullscreen) {
					document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
				}
			} else {
				if (document.cancelFullScreen) {
					document.cancelFullScreen();
				} else if (document.mozCancelFullScreen) {
					document.mozCancelFullScreen();
				} else if (document.webkitCancelFullScreen) {
					document.webkitCancelFullScreen();
				}
			}
		},


		/**
		Opens the settings window.

		@method openSettings
		**/
		openSettings : function(){
			$addClass( $('.rilejs-settings', this.viewer), 'visible');
		},


		/**
		Hides the settings window
		
		@method hideSettings
		**/
		hideSettings : function(){
			$removeClass( $('.rilejs-settings', this.viewer), 'visible');
		},


		/**
		Sets the font size. Font size will be stored in localStorage if possible.

		@method setFontSize
		@param value {String} font size, can be set to 'small', 'medium' or 'large'
		@param render {Boolean} Should the EPUB file be rendered again?
		**/
		setFontSize : function( value, render ) {
			if ( typeof render == 'undefined' ) {
				render = false;
			}

			this.font_size = value; 

			var rendr_body = $('.rilejs-renderer', this.viewer ).contentWindow.document.body,
				page1_body = $('.rilejs-page1'   , this.viewer ).contentWindow.document.body;

			rendr_body.style.fontSize = FONT_SIZES[ this.font_size ];
			page1_body.style.fontSize = FONT_SIZES[ this.font_size ];

			localStorage && localStorage.setItem('rilejs-font_size', this.font_size );

			render && this.render();
		},


		/**
		Sets the color theme. Theme will be stored in localStorage if possible.

		@method setTheme
		@param value {String} theme, can be set to 'light', 'gray', 'sepia', 'dark', 'black' or 'black2'
		@param render {Boolean} Should the EPUB file be rendered again?
		**/
		setTheme : function( value, render ){
			var self = this;

			if ( typeof render == 'undefined' ) {
				render = false;
			}

			this.theme = value; 

			$each( THEMES, function( theme ){
				$removeClass( self.viewer, 'rilejs-style-' + theme );
			});

			$addClass( this.viewer, 'rilejs-style-' + this.theme );

			localStorage && localStorage.setItem('rilejs-theme', this.theme );

			render && this.render();
		},


		/**
		Renders the EPUB by slicing the whole content to separate subpages.

		@method render 
		**/
		render : function(){
			this.scalePages();

			var self = this;

			var progress = this.current_subpage / this.total_subpages;

			this.renderPages(function(){
				self.current_subpage = Math.floor( self.total_subpages * progress );
				self.showPage( self.current_subpage  );
				self.updateCurrentReadingPosition();
			});
		},


		/**
		@method renderGUI
		@param template {String} Template for the GUI of the entire application.
		**/
		renderGUI : function( template ) {
			var self = this;
			
			this.viewer.innerHTML = template;

			var page1_doc = $('.rilejs-page1', this.viewer ).contentWindow.document,
				rendr_doc = $('.rilejs-renderer', this.viewer ).contentWindow.document;

			if( !page1_doc.body ) {
				page1_doc.write('<body></body>');
			}

			if( !rendr_doc.body ) {
				rendr_doc.write('<body></body>');
			}


			page1_doc.body.style.padding = 0;
			page1_doc.body.style.margin  = 0;
			rendr_doc.body.style.padding = 0;
			rendr_doc.body.style.margin  = 0;
			
			var container = $('.rilejs-container', this.viewer ),
				toolbar   = $('.rilejs-toolbar'  , this.viewer );


			// If the theme and font size values are saved in localStorage, 
			// we will read those values and set them to the application. 
			// If they are not saved, we will use some default settings here.
			this.setTheme(    ( localStorage && localStorage.getItem('rilejs-theme') )     || DEFAULT_THEME     );
			this.setFontSize( ( localStorage && localStorage.getItem('rilejs-font_size') ) || DEFAULT_FONT_SIZE );

			
			// Determining the right event name for going fullscreen
			var event_name = 'fullscreenchange';

			if ( document.documentElement.webkitRequestFullscreen ) {
				event_name = 'webkitfullscreenchange';
			} else if ( document.documentElement.mozRequestFullScreen ) {
				event_name = 'mozfullscreenchange';
			}

			var default_size = [
				self.viewer.offsetWidth,
				self.viewer.offsetHeight
			];

			document.addEventListener( event_name, function(){

				if ( !self._fullscreen_requested ) {
					return;
				}

				if ( self.isFullscreen() ) {
					self.viewer.style.width  = screen.width  + 'px';
					self.viewer.style.height = screen.height + 'px';

				} else {
					self.viewer.style.width  = default_size[0] + 'px';
					self.viewer.style.height = default_size[1] + 'px';
				}

				$toggleClass( self.viewer, 'rilejs-fullscreen' );

				self.render();

				self._fullscreen_requested = false;
			});


			// Navigating between pages by using the left and
			// right keyboard arrows.
			document.addEventListener( 'keydown', function(e){
				var e = e || window.event;

				switch( e.keyCode ) {
					case 39:
						self.nextPage();
						break;
					case 37:
						self.prevPage();
						break;
				}
			});

			// Blocking the context menu for everything except the content.
			document.body.addEventListener( 'contextmenu', function(e){
				var node = e.target;
				while( node.parentNode ) {
					if ( node.getAttribute('id') == 'rilejs-page1' ) {
						return;
					}
					node = node.parentNode;
				}
				e.preventDefault && e.preventDefault();
				return false;
			}, true);



			// Hides the setting popup menu when 
			// user click somewhere in the application.
			window.addEventListener('mousedown', function(e){
				self.hideSettings();
			});


			// Also, we block every dblclick, that prevents the 
			// browser from selecting text in the whole application.
			this.viewer.addEventListener('dblclick', function(e){
				e.preventDefault();
			});



			// Shows / hides the next and previous button on 
			// the sides of the screen, based on the current 
			// mouse position. If the mouse is near of one of 
			// those buttons, the nearest button will slide 
			// into view. 
			var next_page_el = $('.rilejs-next-page', this.viewer),
				prev_page_el = $('.rilejs-prev-page', this.viewer);

			var limit = -next_page_el.getBoundingClientRect().width;

			next_page_el.style.marginRight = limit + 'px';
			prev_page_el.style.marginLeft  = limit + 'px';

			function mouseMove( e ) {
				var next_bounds = next_page_el.getBoundingClientRect(),
					prev_bounds = prev_page_el.getBoundingClientRect(),
					cnt_bounds  = container.getBoundingClientRect();

				var m_l = - ( e.pageX / 3 ),
					m_r = - ( cnt_bounds.width - e.pageX ) / 3;

				if ( m_l > 0 ) m_l = 0;
				if ( m_r > 0 ) m_r = 0;

				prev_page_el.style.marginLeft  = m_l + 'px';
				next_page_el.style.marginRight = m_r + 'px';
			}

			window.addEventListener('mousemove', mouseMove);

			$('.rilejs-page1'   , this.viewer).contentWindow.addEventListener('mousemove', mouseMove);
			$('.rilejs-renderer', this.viewer).contentWindow.addEventListener('mousemove', mouseMove);



			// Just a nice feature allowing the user change 
			// pages by using the scroll wheel.
			function onMousewheel(e){
				e.preventDefault()
				var delta = e.detail || e.wheelDelta;
				self[ delta > 0 ? 'nextPage' : 'prevPage' ]();
			}

			this.viewer.addEventListener('DOMMouseScroll', onMousewheel);
			this.viewer.addEventListener('mousewheel'    , onMousewheel);



			// And of course navigation by using the next/prev 
			// page button on the sides.
			$( '.rilejs-next-page', this.viewer ).addEventListener('mousedown', function(e){
				e.preventDefault && e.preventDefault();
				self.nextPage();
			});

			$( '.rilejs-prev-page', this.viewer ).addEventListener('mousedown', function(e){
				e.preventDefault && e.preventDefault();
				self.prevPage();
			});



			// Binding setFontSize to every button in the settings 
			// popup that should set the font size of the content.
			$each( $$( '.rilejs-settings .icon-font', this.viewer ), function(el){
				el.addEventListener('mousedown', function(e){
					e.preventDefault && e.preventDefault();
					self.setFontSize( e.target.getAttribute('data-value'), true );
				});
			});



			// The same goes for the theme buttons. Except that by 
			// changing the theme, the content is not rendered 
			// again, because changing the color doesn't change 
			// the flow of the text (font size obviously does).
			$each( $$( '.rilejs-settings .icon-adjust', this.viewer ), function(el){
				el.addEventListener('mousedown', function(e){
					e.preventDefault && e.preventDefault();
					self.setTheme( e.target.getAttribute('data-value') );
				});
			});


			// Finds all elements with a "data-action" attribute and binds an onClick 
			// event that will try to fire a Rile[ method ], where method is the value
			// of the data-action attribute.
			$each( $$('[data-action]', toolbar ), function(el){
				el.addEventListener('click', function(e){
					e.preventDefault()
					var fn_name = el.getAttribute('data-action');
					self[ fn_name ] && self[ fn_name ]();
				}, true);
			});
		},



		/**
		@method readMetaData
		**/
		readMetaData : function( content ){
			var self = this;
			
			$each( $$('metadata > *', content), function( el ){
				if ( el.tagName == 'meta' ) {
					var key = el.getAttribute('name') || el.getAttribute('property');

					if ( key.indexOf(':') != -1 ) { 
						key = key.split(':')[1];
					}
					
					self.meta[ key ] = el.getAttribute('content') || el.innerText;
				
				} else {
					self.meta[ el.localName ] = el.nodeType == NODE ? el.innerText : el.nodeValue;
				}
			});
		},



		/**
		@method renderPages
		**/
		renderPages : function( callback ){
			var callback = callback || function(){},
				self     = this;
			
			this._rendering_in_progress = true;
			this.pages = [];
			this.total_subpages = 0;

			$('.rilejs-renderer-container', this.viewer ).style.display = 'block';

			var contents = $$('.rilejs-page .rilejs-content', this.viewer);
			
			$each( contents, function( content ){
				while ( content.hasChildNodes() ) {
				    content.removeChild(content.lastChild);
				}
			});

			var sliced = 0;

			if ( this.xmldocs.length ) {
				this.showSpinner();
			} else {
				callback();
			}

			for( var i = 0, l = this.xmldocs.length; i < l; ++i ) {
				this.sliceDocument( i, function(){
					sliced++
					if ( sliced >= self.xmldocs.length ) {
						callback();
						self.hideSpinner();
						self._rendering_in_progress = false;
						$('.rilejs-renderer-container', self.viewer ).style.display = 'none';
					}
				});
			}
		},


		/**
		@method sliceDocument
		@param page_index {Number}
		@param callback {Function}
		**/
		sliceDocument : function( page_index, callback ){
			var callback = callback || function(){},
				self     = this,
				page     = self.xmldocs[ page_index ];
			
			this.sliceIntoPages( page, function( single_page, render_time_ms ){
				//console && console.info && console.info('page rendered in ' + render_time_ms + 'ms');
				
				if ( typeof self.pages[ page_index ] == 'undefined' ) {
					self.pages[ page_index ] = []
					self.pages_currently_rendered[ page_index ] = true
				}
				
				self.pages[ page_index ].push( single_page )
				self.total_subpages += 1;

				self.updateCurrentReadingPosition();

			}, function( pages, render_time_ms ){
				//console && console.info && console.info('All pages rendered in ' + render_time_ms + 'ms');
				self.pages_currently_rendered[ page_index ] = false;
				self.updateCurrentReadingPosition();
				callback();
			});
		},


		/**
		Displays the title by getting the content from META data of the EPUB document.

		@method displayTitle
		**/
		displayTitle : function (){
			$('.rilejs-title', this.viewer ).innerText = this.getTitle();
		},


		/**
		Updates the current reading position by changing the "current page"
		number and setting the width of the progress bar.

		@method updateCurrentReadingPosition
		**/
		updateCurrentReadingPosition : function( ){
			// We need to update total page count
			var c_page     = this.getCurrentPage(),
				percentage = c_page[0] / c_page[1] * 100;

			// TODO: fix page numbers
			$$( '.rilejs-page1-container .rilejs-page-number', this.viewer )[0].innerText = c_page.join(' / ');
			$$( '.rilejs-progress span', this.viewer )[0].style.width = percentage + '%';
		},


		/**
		Slices given document into single pages that fit the container "#rilejs-page1 .rilejs-content" container

		@method sliceIntoPages
		@param xml XML document that should be sliced.
		@param page_callback {Function} Function called when a single page has been cut.
		@param total_callback {Function} Function called when all the pages have been cut.
		**/
		// TODO: do it async, we don't want to block the UI... dooh.
		sliceIntoPages : function( xml, page_callback, total_callback ){
			var renderer         = $('.rilejs-renderer', this.viewer ),
				renderer_height  = renderer.getBoundingClientRect().height,
				range            = renderer.contentWindow.document.createRange(),
				pages            = [];
			
			$emptyDocument( renderer );

			var root = renderer.contentWindow.document.body;

			root.appendChild( xml );
			root.style.overflow = 'auto';
			root.scrollTop      = 0;

			var start_ms     = new Date().getTime()
				start_node   = root.firstChild,
				end_node     = root.firstChild,
				start_offset = 0,
				end_offset   = 0,
				marginTop    = calcMarginTop( start_node, root );

			range.setStart( start_node , start_offset );
			range.setEnd  ( end_node   , end_offset   );

			var last_page_ms    = new Date().getTime(),
				last_node       = null,
				last_end_offset = 0;


			traverse( root.firstChild, function( node, level, index ){

				end_node = node;

				if ( node.nodeType == TEXT && !(/^\s+$/g).test(node.nodeValue)) {

					var limit = end_node.nodeType == NODE ? end_node.childNodes.length : end_node.length;

					while( end_offset <= limit ) {
						range.setEnd( end_node, end_offset )
						var height = range.getBoundingClientRect().height + marginTop;


						// If the height of our range selction is greater 
						// than the height of the renderer, then we can 
						// extract a page and break the loop;
						if ( last_node && height > renderer_height ) {
							range.setEnd( last_node, last_end_offset )

							var page = range.cloneContents();

							pages.push( page );
							page_callback( page, new Date().getTime() - last_page_ms )
			
							root.scrollTop  += height;
							last_page_ms     = new Date().getTime();
							start_node       = last_node;
							start_offset     = last_end_offset
							last_end_offset  = end_offset;

							marginTop = calcMarginTop( start_node, root );
							
							range.setStart( start_node , start_offset );
							range.setEnd  ( end_node   , end_offset   );

							break;
						}

						end_offset++;
					}
				}

				last_node       = node;
				last_end_offset = 0;
				end_offset      = 0;
			});
		

			if ( pages.length ) {
				range.setEnd( last_node, last_node.nodeType == TEXT ? last_node.length : last_node.childNodes.length );
				
				var last_page = range.cloneContents();
				
				page_callback( last_page, new Date().getTime() - last_page_ms );
				pages.push( last_page )
			}



			// If there are no pages found, it means that probably the given 
			// page has a smaller height than the height of the renderer.
			// In that case we can just return that page.
			if ( !pages.length ) {
				var page = document.createDocumentFragment();
				page.appendChild( xml );
				page_callback( page, new Date().getTime() - last_page_ms );
				pages.push( page );
			}

			// Now we can call the callback with the total amount of pages.
			total_callback( pages, new Date().getTime() - start_ms );
		},



		/**
		Shows the 'processing' spinner
		@method showSpinner
		**/
		showSpinner : function(){
			$addClass( $('.rilejs-spinner', this.viewer ), 'visible');
		},


		/**
		Hides the 'processing' spinner
		@method hideSpinner
		**/
		hideSpinner : function(){
			$removeClass( $('.rilejs-spinner', this.viewer ), 'visible');
		},



		/**
		Fix the cover on the given page. There are multiple ways of 
		embeding a cover into the EPUB document. This method tries to 
		fix the cover as good as possible.
		
		@method fixCover
		@param page {Element} The DOM element of a page which has a cover that needs to be fixed.

		TODO: This is just a quick and dirty solution. Check on how many ways a cover can be embedded in an EPUB document.
		**/
		fixCover : function ( page ){

			var container = $('.rilejs-renderer', this.viewer ).contentWindow.document.body,
				bounds    = container.getBoundingClientRect();

			var svgs = $$('svg', page ),
				imgs = $$('img', page );

			var container_height = $('.rilejs-renderer', this.viewer ).contentWindow.ourterHeight;

			for( var i = 0, l = svgs.length; i < l; ++i ) {
				var element = svgs.item( i );
				if ( element.getAttribute('preserveAspectRatio') == 'none' ) {
					element.setAttribute('preserveAspectRatio', 'defer xMidYMid meet');
					element.parentNode.style.height = container_height + 'px';
				}
			}

			for( var i = 0, l = imgs.length; i < l; ++i ) {
				var image = imgs.item( i );
				
				var parent_bounds = container.getBoundingClientRect(),
					image_bounds  = image.getBoundingClientRect();

				if ( image_bounds.width > bounds.width || image_bounds.height > bounds.height ) {
					var h_diff = parent_bounds.height - image_bounds.height;

					var bounds_width = bounds.width,
						bounds_height = bounds.height - h_diff;

					var ratio1 = bounds_width / bounds_height,
						ratio2 = image_bounds.width / image_bounds.height;
					
					if ( ratio1 < ratio2 && ratio2 > 1 ) {
						image.width  = bounds_width;
						image.height = image.width / ratio2 ; 
					
					} else if ( ratio1 < ratio2 ) {
						image.width  = bounds_width;
						image.height = ratio2 * image.width;

					} else if ( ratio1 > ratio2 ) {
						image.height = bounds_height;
						image.width  = ratio2 * image.height;

					} else {
						image.width  = bounds_width;
						image.height = bounds_height;
					}
				} 
			}
		},


		/**
		Hides all pages

		@method hideAllPages
		@param url {String}
		**/
		hideAllPages : function( url ) {
			$each( $$('.rilejs-page1, .rilejs-page2', this.viewer ), function( element ) {
				$css( element, {
					display : 'none'
				}); 
			});
		},



		/**
		@method savePage
		**/
		savePage : function( xml, index ) {
			var page = document.createElement('div');
			
			$each( $$('body > *', xml ), function( node ){
				page.appendChild( node );
			})

			this.xmldocs[ index ] = page;
		},


		/**
		Gets a file from the epubfile

		@function findFileEntry
		@param filename {String}
		@param url {String}
		**/
		findFileEntry : function( filename ) {
			for( var i = 0, l = this.zip_file_entries.length; i < l; ++i ) {
				if ( this.zip_file_entries[i].filename == filename ) {
					return this.zip_file_entries[i];
				}
			}
		},

		/**
		@method readFile
		@param filename {String}
		@oaram url {String}
		@param callback {Function}
		**/
		readFile : function( filename, callback ) {

			if( filename instanceof Array ) {
				var n = 0, entry;
				for (var i = 0, l = filename.length; i < l; ++i ) {
					if ( typeof entry == 'undefined') {
						entry = this.findFileEntry( filename[i] );
					}
				}
			} else {
				var entry = this.findFileEntry( filename );
			}

			entry && entry.getData(new zip.BlobWriter(), function( blob ){
				var reader = new FileReader();
				reader.onload = function(e) {
					callback(e.target.result);
				};
				reader.onerror = onerror;
				reader.readAsText(blob);

			}, function(current, total) {
				// TODO: use a progressbar
			})
		},


		getCurrentPage : function(){
			return [ this.current_subpage + 1, this.total_subpages ];
		},

		getTitle : function(){
			return this.meta[ 'title' ] || this.meta[ 'title_sort' ] || '';
		},

		showPage : function( page_number, context ){
			var page_index    = 0,
				subpage_index = 0;

			for( var i = 0, l = page_number; i < l; ++i ) {

				if ( this.pages[ page_index ] && this.pages[ page_index ][ subpage_index + 1 ] ) {
					subpage_index++;

				} else  if( !this.pages_currently_rendered[ page_index ] ) {
					subpage_index = 0;
					page_index++;
				}
			}

			this.showSubPage( page_index, subpage_index, context );
		},


		/**
		@method showSubPage
		@param index
		@param url
		**/
		showSubPage : function( page_index, subpage_index, context ){
			var page1 = $('.rilejs-page1', this.viewer );

			$css( page1, {
				display    : 'block',
				visibility : 'visible'
			});
			
			var page_index    = page_index    || 0,
				subpage_index = subpage_index || 0;


			if ( this.pages[ page_index ] && this.pages[ page_index ][ subpage_index ] ) {
				$emptyDocument( page1 );
				
				var doc = this.pages[ page_index ][ subpage_index ];

				page1.contentWindow.document.body.appendChild( doc.cloneNode( true ) );

				this.fixCover( page1.contentWindow.document.body );
				this.updateCurrentReadingPosition();
			}
		},


		/**
		@method extactEPUBContentList
		@param callback {Function}
		**/
		extractEPUBContentList : function( callback ){
			var self = this;
			this.readFile( CONTAINER_XML, function( text ){
				var rootfiles = $$('rootfile', $toHTML(text));
				
				if ( rootfiles && rootfiles[0] ) {
					self.readFile( rootfiles[0].getAttribute('full-path'), function( text ){
						callback && callback( $toHTML( text ) );	
					});
				} else {
					throw('No rootfile element found in ' + CONTAINER_XML );
				}
			});
		},



		/**
		@method generateSpineItems
		@param content
		@param url {String}
		@param callback {Function}
		**/
		generateSpineItems : function( content,  callback ) {
			var callback = callback || function(){},
				readed   = 0,
				total    = 0,
				self     = this;

			var itemrefs = $$('spine itemref', content),
				items    = new Array( itemrefs.length );

			total = itemrefs.length;

			$each( itemrefs, function( element, index ){
				var item  = $$('manifest [id="' + element.getAttribute('idref') + '"]', content)[0];
				if ( item ) {
					var href  = item.getAttribute('href'),
						media =	item.getAttribute('media-type');

					self.readFile( [OEBPS + href, EPUB + href, OPS + href ], function( text ){
						items[ index ] = $toHTML( text );
						readed++;
						if ( readed >= total ) {
							callback( items );
						}
					});
				}
			});
		},



		/**
		Searches for every image element (<img/>, <image/>) and replaces 
		the url attribute ([src], [href]) with its own content in a dataURL format.`

		@method renderImages
		@param xml {Element}
		@param callback {Function}
		**/
		renderImages : function( xml, callback ){
			var urls     = [], 
				self     = this,
				callback = callback || function(){};

			$each( this.zip_file_entries, function( entry ){
				urls.push({ 
					filename : entry.filename, 
					path     : entry.filename.replace( OEBPS, '') 
				});
			});

			var imgs   = $$( 'img'  , xml ),
				images = $$( 'image', xml );

			var total = imgs.length + images.length,
				read  = 0;

			function __replaceURL( element, attr  ){
				$each( urls, function( obj ){
					var src = element.getAttribute( attr );
					
					if ( obj.path.indexOf( src ) != -1 || src.indexOf( obj.path ) != -1 ) {
						self.readImage( obj.filename, function( uri ){
							
							element.setAttribute( attr, uri )
							read++
							if ( total <= read ) {
								callback()
							}
						})
					}
				})
			}

			$each( imgs, function(element){
				__replaceURL( element, 'src' );
			});	

			$each( images, function(element){
				__replaceURL( element, 'xlink:href' );
			});

			if ( total <= read ) {
				callback();
			}
		},


		/**
		@method readImage
		@param filename {String}
		@param url {String}
		@param callback {Function}
		**/
		readImage : function( filename, callback ) {
			var entry = this.findFileEntry( filename );
			entry && entry.getData(new zip.Data64URIWriter(), function(uri){
				callback( uri )
			}, function(current, total) {
				// TODO: maybe a progress report in the future?
			})
		},



		/**
		Searches in the xml document for all link elements pointing to a stylesheet. 
		Every content of a stylesheet is read from the zip file (epub) and appended to the iframes document.
		As a last step the original link element is removed from the xml document.

		@method fixStyles
		@param xml {Element}
		@param callback {Function}
		**/
		fixStyles : function( xml, callback ) {
			if ( typeof xml == 'undefined' ) {
				return;
			}

			var callback    = callback || function(){},
				stylesheets = $$('link[rel*="stylesheet"]', xml),
				total       = stylesheets.length,
				read        = 0,
				self        = this;

			$each( stylesheets, function( link ){
				var href = link.getAttribute('href');
				
				if ( !href ) {
					return;
				}

				var url_to_find = href.replace( OEBPS, '').replace(/^\.\.\//gi, '');

				$each( self.zip_file_entries, function( entry ){
					if ( entry.filename.indexOf( url_to_find ) != -1 ) {
						self.readFile( entry.filename, function( stylesheet ){

							var page1_doc = $('.rilejs-page1'   , self.viewer ).contentWindow.document,
								rendr_doc = $('.rilejs-renderer', self.viewer ).contentWindow.document;

							var css         = stylesheet,
							    page1_head  = page1_doc.getElementsByTagName('head')[0],
							    rendr_head  = rendr_doc.getElementsByTagName('head')[0],
							    page1_style = page1_doc.createElement('style'),
							    rendr_style = rendr_doc.createElement('style');

							page1_style.type = 'text/css';
							rendr_style.type = 'text/css';


							// I'm very sorry, I'm a very bad person, and I'm very ashamed of myself, 
							// but I really think that some EPUB documents look really better without 
							// they own background...
							css += 'html, body { background : transparent !important }';


							if ( page1_style.styleSheet){
								page1_style.styleSheet.cssText = css;
							} else {
								page1_style.appendChild(document.createTextNode(css));
							}

							if ( rendr_style.styleSheet){
								rendr_style.styleSheet.cssText = css;
							} else {
								rendr_style.appendChild(document.createTextNode(css));
							}

							page1_head.appendChild( page1_style );
							rendr_head.appendChild( rendr_style );

							link.parentNode.removeChild( link );

							read++;
							
							if ( total <= read ) {
								callback();
							}
						});
					}
				});
			});

			if ( total <= read ) {
				callback();
			}
		},



		/**
		@method scalePages
		**/
		scalePages : function(){
			this.fitPage( $('.rilejs-renderer-container', this.viewer) );
			this.fitPage( $('.rilejs-page1-container'   , this.viewer) );
		},



		/**
		Resizes the page so that it fits the viewer.

		@method fitPage
		**/
		fitPage : function( page ){
			var iframe = $$('iframe', page)[0];

			var container = $('.rilejs-container'),
				hidden    = page.style.visibility == 'hidden'

			page.removeAttribute('style');

			if ( hidden ) {
				page.style.visibility = 'hidden';
			}

			iframe.style.width  = page.offsetWidth  + 'px';
			iframe.style.height = page.offsetHeight + 'px';
		}
	}



	/**
	The standard mime-type of the EPUB file format.

	@property EPUB_MINE
	@static
	@type String
	@default 'application/epub+zip'
	**/
	var EPUB_MIME = 'application/epub+zip';




	/**
	Replaces the given element with our own DOM Element 
	which will later be extended with a GUI of the application.

	@method replaceWithViewer
	@return {Element} returns the new DOM Element which will be the container of the whole application.
	**/
	function replaceWithViewer( element ) {
		var id      = element.getAttribute('id'),
			type    = element.getAttribute('type'),
			width   = element.getAttribute('width'),
			height  = element.getAttribute('height'),
			src     = element.getAttribute('src');

		var viewer = document.createElement('div');

		if ( id != null ) {
			viewer.setAttribute('id', id );
		}
		
		if ( width != null ) {
			viewer.style.width = width + 'px';
		}

		if ( height != null ) {
			viewer.style.height = height + 'px';
		}

		if ( src != null ) {
			viewer.setAttribute('data-epub', src);
		}

		$addClass( viewer, 'rilejs-viewer');

		element.parentNode.replaceChild( viewer, element );

		return viewer;
	}


	/**
	Includes the ZIP.js library into the DOM tree

	@method includeZIPLib
	@async
	@param path {String} Relative or absolute path to the directory with /lib/zip*.js on the server.
	@param callback {Function} Callback function called when all script will be loaded.
	**/
	function includeZIPLib( path, callback ){
		var script_zip     = document.createElement('script'),
			script_zip_ext = document.createElement('script');
		
		script_zip.setAttribute('src', path + 'lib/zip.js');
		script_zip_ext.setAttribute('src', path + 'lib/zip-ext.js');

		script_zip.onload = function(){
			script_zip_ext.onload = function(){
				zip.workerScriptsPath = path + "/lib/";
				callback();
			}
			document.body.appendChild( script_zip_ext );
		}

		document.body.appendChild( script_zip );
	}


	/**
	Includes stylesheets that are needed fot the GUI.

	@function includeStylesheets
	@param path {String} Relative or absolute path to the css/ directory on the server.
	**/
	function includeStylesheets( path, callback ) {
		var stylesheet1 = document.createElement('link'),
			stylesheet2 = document.createElement('link');

		stylesheet1.setAttribute('rel', 'stylesheet');
		stylesheet2.setAttribute('rel', 'stylesheet');

		stylesheet1.setAttribute('type', 'text/css');
		stylesheet2.setAttribute('type', 'text/css');

		stylesheet1.setAttribute('href', path + 'css/font-awesome.min.css' );
		stylesheet2.setAttribute('href', path + 'css/main.css' );

		document.body.appendChild( stylesheet1 );
		document.body.appendChild( stylesheet2 );
	}


	domready(function () {
		// First, we need some intel where we are, if somebody would tell 
		// us that, that would be great.
		// The path variable is obtained from the "data-rilejs-path" attribute 
		// on the script element that includes rile.js into the page. If the 
		// path attribute doesn't exist, then we will try our luck with the 
		// default location. 
		var script_el = document.querySelector('script[data-rilejs-path]'), 
			path      = './rile';

		if ( script_el ) {
			path = script_el.getAttribute('data-rilejs-path');
			if ( !(/\/$/g).test( path ) ) {
				path = path + '/';
			}
		}

		// Now let's look around and see if we can get some 'embed' 
		// elements (with the right type attribute of course) that we can replace.
		var embed_elems = document.querySelectorAll('embed[type="' + EPUB_MIME + '"]'),
			viewers     = [];

		// All those embed elements are now replaced with our dummy viewer elements,
		// we will place into them some GUI later when we get the template.
		for( var i = 0, l = embed_elems.length; i < l; ++i ) {
			viewers.push( new Rile( embed_elems[ i ] ) );
		}

		window.viewers = viewers;

		
		var xhr = new XMLHttpRequest();

		xhr.open('GET', path + 'rile.tpl', true);

		xhr.onreadystatechange = function(){
			if ( this.readyState == 4 ) {
				var template = this.responseText;

				for( var i = 0, l = viewers.length; i < l; ++i ) {
					viewers[i].renderGUI( template );
				}

				// Injecting ZIP.js library
				includeZIPLib( path, function(){
					for( var i = 0, l = viewers.length; i < l; ++i ) {
						// Resizing all pages for the first time.
						viewers[i].scalePages();

						// Reads the EPUB document, parses it and renders to the viewer.
						viewers[i].process();
					}
				});

				includeStylesheets( path );
			}
		}

		xhr.send();		
	});


	// Just exposes our class to the world
	global.Rile = Rile;






	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//                                                                                                  //
	//  HELPERS                                                                                         //
	//  -------                                                                                         //
	//  Various helper functions used for easy DOM manipulation                                         //
	//                                                                                                  //
	//////////////////////////////////////////////////////////////////////////////////////////////////////



	/**
	Helper function.
	Alias for document.querySelector.

	@function $
	@param selection {String} DOM query selector.
	@param context {Element} DOM element in which the query should be performed.
	@return {Element} DOM element
	**/
	function $( selector, context ){
		return ( context && context.querySelector ? context : document ).querySelector( selector );
	}



	/**
	Helper function.
	Alias for document.querySelectorAll.
	
	@function $$
	@param selection {String} DOM query selector.
	@param context {Element} DOM element in which the query should be performed.
	@return {NodeList} list of DOM nodes
	**/
	function $$( selector, context ){
		return ( context && context.querySelectorAll ? context : document ).querySelectorAll( selector );
	}




	/**
	Helper function for styling DOM elements.

	@function $css
	@param element {Element} DOM element
	@param styles {Object} Key value list of styles for example: { border : "red", background : "white" } 
	**/
	function $css( element, styles ){
		for( var key in styles ) {
			element.style[ key ] = styles[ key ];
		}
	}


	/**
	Removes all children from the given element.

	@function $empty
	@param element {Element} DOM element to be emptied.
	**/
	function $empty( element ){
		if ( element ) {
			while( element.hasChildNodes() ) {
				element.removeChild( element.firstChild );
			}
		}
	}


	/**
	Removes all children from the given element.

	@function $emptyDocument
	@param element {Element} DOM element to be emptied.
	**/
	function $emptyDocument( element ){
		if ( element ) {
			var root = element.contentWindow.document.body;

			while( root.hasChildNodes() ) {
				root.removeChild( root.firstChild );
			}
		}
	}



	/**
	Iterates over given object.

	@function $each
	@param iterable {Array|Object|NodeList}
	@param fn {Function}
	**/
	function $each( iterable, fn ){
		var fn = fn || function(){};

		if ( iterable instanceof Array || iterable instanceof NodeList ) {
			for( var i = 0, l = iterable.length; i < l; ++i ) {
				fn( iterable[i], i );
			}
		} else if ( typeof iterable == 'object') {
			for( var i in iterable ) {
				fn( iterable[i], i );
			}
		}
	}


	/**
	Checks if the DOM Element has the given class name assigned. 

	@function $hasClass
	@param element {Element}
	@param className {String}
	@return {Boolean} true if the element has the className assigned, false otherwise.
	**/
	function $hasClass( element, className ) {
		var className1 = className.split(' '),
			className2 = element.className.split(' ');

		for( var i = 0, l1 = className1.length; i < l1; ++i ) {
			for( var j = 0, l2 = className2.length; j < l2; ++j ) {
				if ( className1[i] == className2[j] ) {
					return true;
				}
			}
		}

		return false;
	}


	/**
	Adds a className to an element

	@function addClass
	@param element {Element}
	@param className {String}
	**/
	function $addClass( element, className ) {
		var className = className.split(' ');

		for( var i = 0, l = className.length; i < l; ++i ) {
			if ( !$hasClass( element, className[i] ) ) {
				element.className += ' ' + className[i];
			}
		}
	}


	/**
	@function removeClass
	@param element {Element}
	@param className {String}
	**/
	function $removeClass( element, className ) {
		var className1 = className.split(' '),
			className2 = element.className;

		for( var i = 0, l = className1.length; i < l; ++i ) {
			className2 = className2.replace( className1[i], '' );
		}

		element.className = className2.replace( /\s{2}/g, '' );
	}


	/**
	@function $toggleClass
	@param element {Element}
	@param className {String}
	**/
	function $toggleClass( element, className ) {
		var className = className.split(' ');
		for( var i = 0, l = className.length; i < l; ++i ) {
			if ( $hasClass( element, className[i] )) {
				$removeClass( element, className[i] );
			} else {
				$addClass( element, className[i] );
			}
		}
	}



	/**
	@function $toHTML
	@param text {String}
	**/
	function $toHTML( text ){
		// All the normal browsers
		if ( typeof DOMParser != 'undefined' ) {
			var parser = new DOMParser(),
				xml    = parser.parseFromString( text, "text/xml" );

		// Our most belowed browser IE <3
		} else if ( typeof ActiveXObject != 'undefined' ) {
			var xml = new ActiveXObject("Microsoft.XMLDOM");
			xml.load( text );
		}

		return xml;
	}



	/**
	@function calcMarginTop
	@param node
	@param limit_node
	**/
	function calcMarginTop( node, limit_node ){
		var margin_top = 0;

		while( node.parentNode != limit_node ) {
			var style = ( node.currentStyle || window.getComputedStyle( node ) );
			margin_top += parseFloat( style ? style.marginTop : 0);
			node = node.parentNode;
		}

		return margin_top;
	}




	/**
	@function traverse
	@param node
	@param iter_fn
	@param callback
	@param cursor
	**/
	function traverse( node, iter_fn, callback, cursor ) {
		var cursor = cursor || {
			level : 0,
			addr  : []
		}

		// If we have some children, time to go into first (or some next) child.
		if ( node.hasChildNodes() ) {
			cursor.level++;
			if ( typeof cursor.addr[ cursor.level ] == 'undefined' ) {
				cursor.addr[ cursor.level ] = 0;
			}
			if ( iter_fn( node.childNodes[ cursor.addr[ cursor.level ] ], cursor.level, cursor.addr[ cursor.level ] ) === false ) return;
			traverse( node.childNodes[ cursor.addr[ cursor.level ] ], iter_fn, callback, cursor );
		

		// If there is a sibling, we will traverse into it.
		} else if ( node.nextSibling ) {
			cursor.addr[ cursor.level ]++;
			if ( iter_fn( node.nextSibling, cursor.level, cursor.addr[ cursor.level ] - 1 ) === false ) return;
			traverse( node.nextSibling, iter_fn, callback, cursor );


		} else if ( node.parentNode && node.parentNode.parentNode ) {
			while ( cursor.level > 1 && !node.parentNode.parentNode.childNodes[ cursor.addr[ cursor.level - 1 ] + 1 ] ) {
				cursor.addr[ cursor.level ] = 0;
				cursor.level--;
				cursor.addr[ cursor.level ]++;
				node = node.parentNode;
			}
			

			cursor.addr[ cursor.level ] = 0;
			cursor.level--;
			cursor.addr[ cursor.level ]++;


			if ( node.parentNode && node.parentNode.parentNode && node.parentNode.parentNode.childNodes[ cursor.addr[ cursor.level ] ] ) {
				if ( iter_fn( node.parentNode.parentNode.childNodes[ cursor.addr[ cursor.level ] ], cursor.level, cursor.addr[ cursor.level ] - 1 ) === false ) return;

				traverse( node.parentNode.parentNode.childNodes[ cursor.addr[ cursor.level ] ], iter_fn, callback, cursor );
				
			} else {
				callback && callback();
			}

		} else{
			callback && callback();
		}
	}



})(this);