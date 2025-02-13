var StartScreen;
var ColorPanel;

//Panels

class ResizeLine {
	constructor(data) {
		var scope = this;
		this.id = data.id
		this.horizontal = data.horizontal === true
		this.position = data.position
		this.condition = data.condition
		this.width = 0;
		var jq = $('<div class="resizer '+(data.horizontal ? 'horizontal' : 'vertical')+'"></div>')
		this.node = jq.get(0)
		jq.draggable({
			axis: this.horizontal ? 'y' : 'x',
			containment: '#work_screen',
			revert: true,
			revertDuration: 0,
			start: function(e, u) {
				scope.before = data.get()
			},
			drag: function(e, u) {
				if (scope.horizontal) {
					data.set(scope.before, u.position.top - u.originalPosition.top)
				} else {
					data.set(scope.before, (u.position.left - u.originalPosition.left))
				}
				updateInterface()
			},
			stop: function(e, u) {
				updateInterface()
			}
		})
	}
	update() {
		if (BARS.condition(this.condition)) {
			$(this.node).show()
			if (this.position) {
				this.position(this)
			}
		} else {
			$(this.node).hide()
		}
	}
	setPosition(data) {
		var jq = $(this.node)
		jq.css('top', 	data.top 	!== undefined ? data.top+	'px' : '')
		jq.css('bottom',data.bottom !== undefined ? data.bottom+'px' : '')
		jq.css('left', 	data.left 	!== undefined ? data.left+	'px' : '')
		jq.css('right', data.right 	!== undefined ? data.right+	'px' : '')

		if (data.top !== undefined) {
			jq.css('top', data.top+'px')
		}
		if (data.bottom !== undefined && (!data.horizontal || data.top === undefined)) {
			jq.css('bottom', data.bottom+'px')
		}
		if (data.left !== undefined) {
			jq.css('left', data.left+'px')
		}
		if (data.right !== undefined && (data.horizontal || data.left === undefined)) {
			jq.css('right', data.right+'px')
		}
	}
}

const Interface = {
	default_data: {
		left_bar_width: 366,
		right_bar_width: 314,
		quad_view_x: 50,
		quad_view_y: 50,
		timeline_height: 260,
		left_bar: ['uv', 'textures', 'display', 'animations', 'keyframe', 'variable_placeholders'],
		right_bar: ['element', 'bone', 'color', 'outliner', 'chat']
	},
	get left_bar_width() {
		return Prop.show_left_bar ? Interface.data.left_bar_width : 0;
	},
	get right_bar_width() {
		return Prop.show_right_bar ? Interface.data.right_bar_width : 0;
	},
	Resizers: {
		left: new ResizeLine({
			id: 'left',
			condition: function() {
				if (!Prop.show_left_bar) return false;
				for (let p of Interface.data.left_bar) {
					if (Interface.Panels[p] && BARS.condition(Interface.Panels[p].condition)) {
						return true;
					}
				}
			},
			get: function() {return Interface.data.left_bar_width},
			set: function(o, diff) {
				let min = 128;
				let calculated = limitNumber(o + diff, min, window.innerWidth- 120 - Interface.data.right_bar_width)
				Interface.data.left_bar_width = Math.snapToValues(calculated, [Interface.default_data.left_bar_width], 16);
				
				if (calculated == min) {
					Prop.show_left_bar = false;
					Interface.data.left_bar_width = Interface.default_data.left_bar_width;
				} else {
					Prop.show_left_bar = true;
				}
			},
			position: function(line) {
				line.setPosition({
					top: document.getElementById('work_screen').offsetTop,
					bottom: 0,
					left: Interface.data.left_bar_width+2
				})
			}
		}),
		right: new ResizeLine({
			id: 'right',
			condition: function() {
				if (!Prop.show_right_bar) return false;
				for (let p of Interface.data.right_bar) {
					if (Interface.Panels[p] && BARS.condition(Interface.Panels[p].condition)) {
						return true;
					}
				}
			},
			get: function() {return Interface.data.right_bar_width},
			set: function(o, diff) {
				let min = 128;
				let calculated = limitNumber(o - diff, min, window.innerWidth- 120 - Interface.data.left_bar_width);
				Interface.data.right_bar_width = Math.snapToValues(calculated, [Interface.default_data.right_bar_width], 12);
				
				if (calculated == min) {
					Prop.show_right_bar = false;
					Interface.data.right_bar_width = Interface.default_data.right_bar_width;
				} else {
					Prop.show_right_bar = true;
				}
			},
			position: function(line) {
				line.setPosition({
					top: document.getElementById('work_screen').offsetTop+30,
					bottom: 0,
					right: Interface.data.right_bar_width-2
				})
			}
		}),
		quad_view_x: new ResizeLine({
			id: 'quad_view_x',
			condition: function() {return quad_previews.enabled},
			get: function() {return Interface.data.quad_view_x},
			set: function(o, diff) {Interface.data.quad_view_x = limitNumber(o + diff/$('#preview').width()*100, 5, 95)},
			position: function(line) {
				var p = document.getElementById('preview')
				line.setPosition({
					top: 32,
					bottom: p ? window.innerHeight - (p.clientHeight + p.offsetTop) : 0,
					left: Interface.left_bar_width + $('#preview').width()*Interface.data.quad_view_x/100
				}
			)}
		}),
		quad_view_y: new ResizeLine({
			id: 'quad_view_y',
			horizontal: true,
			condition: function() {return quad_previews.enabled},
			get: function() {return Interface.data.quad_view_y},
			set: function(o, diff) {
				Interface.data.quad_view_y = limitNumber(o + diff/$('#preview').height()*100, 5, 95)
			},
			position: function(line) {line.setPosition({
				left: Interface.left_bar_width+2,
				right: Interface.right_bar_width+2,
				top: $('#preview').offset().top + $('#preview').height()*Interface.data.quad_view_y/100
			})}
		}),
		timeline: new ResizeLine({
			id: 'timeline',
			horizontal: true,
			condition: function() {return Modes.animate},
			get: function() {return Interface.data.timeline_height},
			set: function(o, diff) {
				Interface.data.timeline_height = limitNumber(o - diff, 150, document.body.clientHeight-120)
			},
			position: function(line) {line.setPosition({
				left: Interface.left_bar_width+2,
				right: Interface.right_bar_width+2,
				top: $('#timeline').offset().top
			})}
		})
	},
	status_bar: {},
	Panels: {},
	toggleSidebar(side) {
		let status = !Prop[`show_${side}_bar`];
		Prop[`show_${side}_bar`] = status;
		resizeWindow();
	}
}
Interface.panel_definers = []
Interface.definePanels = function(callback) {
	Interface.panel_definers.push(callback);
}

//Misc
function unselectInterface(event) {
	if (open_menu && $('.contextMenu').find(event.target).length === 0 && $('.menu_bar_point.opened:hover').length === 0) {
		open_menu.hide();
	}
	if (ActionControl.open && $('#action_selector').find(event.target).length === 0) {
		ActionControl.hide();
	}
	if ($(event.target).is('input.cube_name:not([disabled])') === false && Blockbench.hasFlag('renaming')) {
		stopRenameOutliner()
	}
}
function setupInterface() {
	Interface.data = $.extend(true, {}, Interface.default_data)
	var interface_data = localStorage.getItem('interface_data')
	try {
		interface_data = JSON.parse(interface_data)
		var old_data = Interface.data
		if (interface_data.left_bar) Interface.data.left_bar = interface_data.left_bar;
		if (interface_data.right_bar) Interface.data.right_bar = interface_data.right_bar;
		$.extend(true, Interface.data, interface_data)
	} catch (err) {}

	translateUI()
	
	$('.edit_session_active').hide()

	$('#center').toggleClass('checkerboard', settings.preview_checkerboard.value);

	setupPanels()
	
	if (Blockbench.isMobile && window.setupMobilePanelSelector) {
		setupMobilePanelSelector()
	}

	for (var key in Interface.Resizers) {
		var resizer = Interface.Resizers[key]
		$('#work_screen').append(resizer.node)
	}
	//$(document).contextmenu()


	//Tooltip Fix
	$(document).on('mouseenter', '.tool', function() {
		var tooltip = $(this).find('div.tooltip')
		if (!tooltip || typeof tooltip.offset() !== 'object') return;
		//Left
		if (tooltip.css('left') === '-4px') {
			tooltip.css('left', 'auto')
		}
		if (-tooltip.offset().left > 4) {
			tooltip.css('left', '-4px')
		}
		//Right
		if (tooltip.css('right') === '-4px') {
			tooltip.css('right', 'auto')
		}

		if ((tooltip.offset().left + tooltip.width()) - window.innerWidth > 4) {
			tooltip.css('right', '-4px')
		} else if ($(this).parent().css('position') == 'relative') {
			tooltip.css('right', '0')
		}
	})




	//Clickbinds
	$('header'	).click(function() { setActivePanel('header'  )})
	$('#preview').click(function() { setActivePanel('preview' )})

	$('#texture_list').click(function(){
		unselectTextures()
	})
	$('#timeline').mousedown((event) => {
		setActivePanel('timeline');
	})
	$(document).on('mousedown touchstart', unselectInterface)

	window.addEventListener('resize', resizeWindow);
	window.addEventListener('orientationchange', () => {
		setTimeout(resizeWindow, 100)
	});

	setProjectTitle()

	Interface.text_edit_menu = new Menu([
		{
			id: 'copy',
			name: 'Copy',
			icon: 'fa-copy',
			click() {
				document.execCommand('copy');
			}
		},
		{
			id: 'paste',
			name: 'Paste',
			icon: 'fa-paste',
			click() {
				document.execCommand('paste');
			}
		}
	])

	$(document).on('contextmenu', function(event) {
		if (!$(event.target).hasClass('allow_default_menu')) {
			if (event.target.nodeName === 'INPUT' && $(event.target).is(':focus')) {
				Interface.text_edit_menu.open(event, event.target)
			}
			return false;
		}
	})

	//Scrolling
	$('input[type="range"]').on('mousewheel', function () {
		var obj = $(event.target)
		var factor = event.deltaY > 0 ? -1 : 1
		var val = parseFloat(obj.val()) + parseFloat(obj.attr('step')) * factor
		val = limitNumber(val, obj.attr('min'), obj.attr('max'))

		if (obj.attr('trigger_type')) {
			DisplayMode.scrollSlider(obj.attr('trigger_type'), val, obj)
			return;
		}

		obj.val(val)
		eval(obj.attr('oninput'))
		eval(obj.attr('onmouseup'))
	})

	//Mousemove
	$(document).mousemove(function(event) {
		mouse_pos.x = event.clientX
		mouse_pos.y = event.clientY
	})
	updateInterface()
}

function updateInterface() {
	BARS.updateConditions()
	MenuBar.update()
	resizeWindow()
	localStorage.setItem('interface_data', JSON.stringify(Interface.data))
}
function updateInterfacePanels() {

	if (!Blockbench.isMobile) {
		$('.sidebar#left_bar').css('display', Prop.show_left_bar ? 'flex' : 'none');
		$('.sidebar#right_bar').css('display', Prop.show_right_bar ? 'flex' : 'none');
	}
	let work_screen = document.getElementById('work_screen');

	work_screen.style.setProperty(
		'grid-template-columns',
		Interface.data.left_bar_width+'px auto '+ Interface.data.right_bar_width +'px'
	)
	for (var key in Interface.Panels) {
		var panel = Interface.Panels[key]
		panel.update()
	}
	var left_width = $('.sidebar#left_bar > .panel:visible').length ? Interface.left_bar_width : 0;
	var right_width = $('.sidebar#right_bar > .panel:visible').length ? Interface.right_bar_width : 0;

	if (!left_width || !right_width) {
		work_screen.style.setProperty(
			'grid-template-columns',
			left_width+'px auto '+ right_width +'px'
		)
	}

	$('.quad_canvas_wrapper.qcw_x').css('width', Interface.data.quad_view_x+'%')
	$('.quad_canvas_wrapper.qcw_y').css('height', Interface.data.quad_view_y+'%')
	$('.quad_canvas_wrapper:not(.qcw_x)').css('width', (100-Interface.data.quad_view_x)+'%')
	$('.quad_canvas_wrapper:not(.qcw_y)').css('height', (100-Interface.data.quad_view_y)+'%')
	$('#timeline').css('height', Interface.data.timeline_height+'px')
	for (var key in Interface.Resizers) {
		var resizer = Interface.Resizers[key]
		resizer.update()
	}
}

function resizeWindow(event) {
	if (!Preview.all || (event && event.target && event.target !== window)) {
		return;
	}
	if (Interface.data) {
		updateInterfacePanels()
	}
	if (Animator.open) {
		Timeline.updateSize()
	}
	Preview.all.forEach(function(prev) {
		if (prev.canvas.isConnected) {
			prev.resize()
		}
	})
	var dialog = $('dialog#'+open_dialog)
	if (dialog.length) {
		if (dialog.outerWidth() + dialog.offset().left > window.innerWidth) {
			dialog.css('left', limitNumber(window.innerWidth-dialog.outerWidth(), 0, 4e3) + 'px')
		}
		if (dialog.outerHeight() + dialog.offset().top > window.innerHeight) {
			dialog.css('top', limitNumber(window.innerHeight-dialog.outerHeight(), 0, 4e3) + 'px')
		}
	}
	Blockbench.dispatchEvent('resize_window', event);
}

function setProjectTitle(title) {
	let window_title = 'Blockbench';
	if (title == undefined && Project.geometry_name) {
		title = Project.geometry_name
	}
	if (title) {
		Prop.file_name = Prop.file_name_alt = title
		if (!Project.name) {
			Project.name = title
		}
		if (Format.bone_rig) {
			title = title.replace(/^geometry\./,'').replace(/:[a-z0-9.]+/, '')
		}
		window_title = title+' - Blockbench';
	} else {
		Prop.file_name = Prop.file_name_alt = ''
	}
	$('title').text(window_title);
	$('#header_free_bar').text(window_title);
}
//Zoom
function setZoomLevel(mode) {
	if (Prop.active_panel === 'uv') {
		var zoom = UVEditor.zoom
		switch (mode) {
			case 'in':	zoom *= 1.5;  break;
			case 'out':   zoom *= 0.66;  break;
			case 'reset': zoom = 1; break;
		}
		zoom = limitNumber(zoom, 1, 4)
		UVEditor.setZoom(zoom)

	} else if (Prop.active_panel == 'timeline') {
		
		let body = document.getElementById('timeline_body');
		let offsetX = Timeline.vue.scroll_left + (body.clientWidth - Timeline.vue.head_width) / 2;
		
		if (mode == 'reset') {
			let original_size = Timeline.vue._data.size
			Timeline.vue._data.size = 200;
			
			body.scrollLeft += (Timeline.vue._data.size - original_size) * (offsetX / original_size)
		} else {
			let zoom = mode == 'in' ? 1.2 : 0.8;
			let original_size = Timeline.vue._data.size
			let updated_size = limitNumber(Timeline.vue._data.size * zoom, 10, 1000)
			Timeline.vue._data.size = updated_size;
			
			body.scrollLeft += (updated_size - original_size) * (offsetX / original_size)
		}
	} else {
		switch (mode) {
			case 'in':		Preview.selected.controls.dollyIn(1.16);  break;
			case 'out':  	Preview.selected.controls.dollyOut(1.16);  break;
		}
	}
}

//Dialogs
function showDialog(dialog) {
	var obj = $('.dialog#'+dialog)
	$('.dialog').hide()
	if (open_menu) {
		open_menu.hide()
	}
	$('#blackout').show()
	obj.show()
	open_dialog = dialog
	open_interface = {
		confirm() {
			$('dialog#'+open_dialog).find('.confirm_btn:not([disabled])').trigger('click');
		},
		cancel() {
			$('dialog#'+open_dialog).find('.cancel_btn:not([disabled])').trigger('click');
		}
	}
	Prop.active_panel = 'dialog'
	//Draggable
	if (obj.hasClass('draggable')) {
		obj.draggable({
			handle: ".dialog_handle",
			containment: '#page_wrapper'
		})
		var x = (window.innerWidth-obj.outerWidth()) / 2;
		obj.css('left', x+'px')
		obj.css('max-height', (window.innerHeight-128)+'px')
	}
}
function hideDialog() {
	$('#blackout').hide()
	$('.dialog').hide()
	open_dialog = false;
	open_interface = false;
	Prop.active_panel = undefined
}

function getStringWidth(string, size) {
	var a = $('<label style="position: absolute">'+string+'</label>')
	if (size && size !== 16) {
		a.css('font-size', size+'pt')
	}
	$('body').append(a.css('visibility', 'hidden'))
	var width = a.width()
	a.detach()
	return width;
};

//UI Edit
function setProgressBar(id, val, time) {
	if (!id || id === 'main') {
		Prop.progress = val
	} else {
		$('#'+id+' > .progress_bar_inner').animate({width: val*488}, time-1)
	}
	if (isApp) {
		currentwindow.setProgressBar(val)
	}
}

//Tooltip
function showShiftTooltip() {
	$(':hover').find('.tooltip_shift').css('display', 'inline')
}
$(document).keyup(function(event) {
	if (event.which === 16) {
		$('.tooltip_shift').hide()
	}
})

//Start Screen
function addStartScreenSection(id, data) {
	if (typeof id == 'object') {
		data = id;
		id = '';
	}
	var obj = $(`<section id="${id}"></section>`)
	if (typeof data.graphic === 'object') {
		var left = $('<div class="start_screen_left graphic"></div>')
		obj.append(left)

		if (data.graphic.type === 'icon') {
			var icon = Blockbench.getIconNode(data.graphic.icon)
			left.addClass('graphic_icon')
			left.append(icon)
		} else {
			left.css('background-image', `url('${data.graphic.source}')`)
		}
		if (data.graphic.width) {
			left.css('width', data.graphic.width+'px');
		}
		if (data.graphic.width && data.text) {
			left.css('flex-shrink', '0');
		}
		if (data.graphic.width && data.graphic.height && Blockbench.isMobile) {
			left.css('height', '0')
				.css('padding-top', '0')
				.css('padding-bottom', (data.graphic.height/data.graphic.width*100)+'%')
		} else {
			if (data.graphic.height) left.css('height', data.graphic.height+'px');
			if (data.graphic.width && !data.graphic.height && !data.graphic.aspect_ratio) left.css('height', data.graphic.width+'px');
			if (data.graphic.aspect_ratio) left.css('aspect-ratio', data.graphic.aspect_ratio);
		}
		if (data.graphic.description) {
			let content = $(marked(data.graphic.description));
			content.css({
				'bottom': '15px',
				'right': '15px',
				'color': data.graphic.description_color || '#ffffff',
			});
			left.append(content);
		}
	}
	if (data.text instanceof Array) {
		var right = $('<div class="start_screen_right"></div>')
		obj.append(right)
		data.text.forEach(line => {
			var content = line.text ? marked(tl(line.text)) : '';
			switch (line.type) {
				case 'h1': var tag = 'h2'; break;
				case 'h2': var tag = 'h3'; break;
				case 'list':
					var tag = 'ul class="list_style"';
					line.list.forEach(string => {
						content += `<li>${marked(tl(string))}</li>`;
					})
					break;
				case 'button': var tag = 'button'; break;
				default:   var tag = 'p'; break;
			}
			var l = $(`<${tag}>${content}</${tag.split(' ')[0]}>`);
			if (typeof line.click == 'function') {
				l.on('click', line.click);
			}
			right.append(l);
		})
	}
	if (data.layout == 'vertical') {
		obj.addClass('vertical');
	}

	if (data.features instanceof Array) {
		let features_section = document.createElement('ul');
		features_section.className = 'start_screen_features'
		data.features.forEach(feature => {
			let li = document.createElement('li');
			let img = new Image(); img.src = feature.image;
			let title = document.createElement('h3'); title.textContent = feature.title;
			let text = document.createElement('p'); text.textContent = feature.text;
			li.append(img, title, text);
			features_section.append(li);
		})
		obj.append(features_section);
	}

	if (data.closable !== false) {
		obj.append(`<i class="material-icons start_screen_close_button">clear</i>`);
		obj.find('i.start_screen_close_button').click((e) => {
			obj.detach()
		});
	}
	if (typeof data.click == 'function') {
		obj.on('click', event => {
			if (event.target.classList.contains('start_screen_close_button')) return;
			data.click()
		})
	}
	if (data.color) {
		obj.css('background-color', data.color);
		if (data.color == 'var(--color-bright_ui)') {
			obj.addClass('bright_ui')
		}
	}
	if (data.text_color) {
		obj.css('color', data.text_color);
	}
	if (data.last) {
		$('#start_screen content').append(obj);
	} else {
		$('#start_screen content').prepend(obj);
	}
}



(function() {
	/*$.getJSON('./content/news.json').then(data => {
		addStartScreenSection('new_version', data.new_version)
	})*/

	var news_call = $.getJSON('https://web.blockbench.net/content/news.json')
	Promise.all([news_call, documentReady]).then((data) => {
		if (!data || !data[0]) return;
		data = data[0];

		//Update Screen
		if (Blockbench.hasFlag('after_update') && data.new_version) {
			addStartScreenSection(data.new_version)
			jQuery.ajax({
				url: 'https://blckbn.ch/api/event/successful_update',
				type: 'POST',
				data: {
					version: Blockbench.version
				}
			})
		}
		if (data.psa) {
			(function() {
				if (typeof data.psa.version == 'string') {
					if (data.psa.version.includes('-')) {
						limits = data.psa.version.split('-');
						if (limits[0] && compareVersions(limits[0], Blockbench.version)) return;
						if (limits[1] && compareVersions(Blockbench.version, limits[1])) return;
					} else {
						if (data.psa.version != Blockbench.version) return;
					}
				}
				addStartScreenSection(data.psa)
			})()
		}

	})
	documentReady.then(() => {
		Blockbench.startup_count = parseInt(localStorage.getItem('startups')||0)

		//Backup Model
		if (localStorage.getItem('backup_model') && (!isApp || !currentwindow.webContents.second_instance)) {
			var backup_model = localStorage.getItem('backup_model')
			localStorage.removeItem('backup_model')

			addStartScreenSection({
				color: 'var(--color-back)',
				graphic: {type: 'icon', icon: 'fa-archive'},
				text: [
					{type: 'h2', text: tl('message.recover_backup.title')},
					{text: tl('message.recover_backup.message')},
					{type: 'button', text: tl('dialog.ok'), click: (e) => {
						loadModelFile({content: backup_model, path: 'backup.bbmodel', no_file: true})
					}}
				]
			})
		}
		if (settings.streamer_mode.value) {
			updateStreamerModeNotification()
		}

		//Twitter
		let twitter_ad;
		if (Blockbench.startup_count < 20 && Blockbench.startup_count % 5 === 4) {
			twitter_ad = true;
			addStartScreenSection({
				color: '#1da1f2',
				text_color: '#ffffff',
				graphic: {type: 'icon', icon: 'fab.fa-twitter'},
				text: [
					{type: 'h2', text: 'Blockbench on Twitter'},
					{text: 'Follow Blockbench on Twitter for the latest news as well as cool models from the community! [twitter.com/blockbench](https://twitter.com/blockbench/)'}
				],
				last: true
			})
		}
		//Discord
		if (Blockbench.startup_count < 6 && !twitter_ad) {
			addStartScreenSection({
				color: '#5865F2',
				text_color: '#ffffff',
				graphic: {type: 'icon', icon: 'fab.fa-discord'},
				text: [
					{type: 'h2', text: 'Discord Server'},
					{text: 'You need help with modeling or you want to chat about Blockbench? Join the official [Blockbench Discord](https://discord.gg/WVHg5kH)!'}
				],
				last: true
			})
		}

		// Keymap Preference
		if (!Blockbench.isMobile && Blockbench.startup_count <= 1) {

			
			var obj = $(`<section id="keymap_preference">
				<h2>${tl('mode.start.keymap_preference')}</h2>
				<p>${tl('mode.start.keymap_preference.desc')}</p>
				<ul></ul>
			</section>`)

			var keymap_list = $(obj).find('ul');
			
			obj.prepend(`<i class="material-icons start_screen_close_button">clear</i>`);
			obj.find('i.start_screen_close_button').on('click', (e) => {
				obj.detach();
			});

			[
				['default', 'action.load_keymap.default'],
				['mouse', 'action.load_keymap.mouse'],
				['blender', 'Blender'],
				['cinema4d', 'Cinema 4D'],
				['maya', 'Maya'],
			].forEach(([id, name], index) => {

				let node = $(`<li class="keymap_select_box">
					<h4>${tl(name)}</h4>
					<p>${tl(`action.load_keymap.${id}.desc`)}</p>
				</li>`)
				node.on('click', e => {
					Keybinds.loadKeymap(id, true);
					obj.detach();
				})
				keymap_list.append(node);
			})
			
			$('#start_screen content').prepend(obj);
		}
	})

})()

onVueSetup(function() {
	Interface.status_bar.vue = new Vue({
		el: '#status_bar',
		data: {
			Prop,
			isMobile: Blockbench.isMobile,
			streamer_mode: settings.streamer_mode.value,
			selection_info: '',
			Format: null
		},
		methods: {
			showContextMenu(event) {
				Interface.status_bar.menu.show(event);
			},
			toggleStreamerMode() {
				ActionControl.select(`setting: ${tl('settings.streamer_mode')}`);
			},
			updateSelectionInfo() {
				let selection_mode = BarItems.selection_mode.value;
				if (Modes.edit && Mesh.selected.length && selection_mode !== 'object') {
					if (selection_mode == 'face') {
						let total = 0, selected = 0;
						Mesh.selected.forEach(mesh => total += Object.keys(mesh.faces).length);
						Mesh.selected.forEach(mesh => mesh.forAllFaces(face => selected += (face.isSelected() ? 1 : 0)));
						this.selection_info = tl('status_bar.selection.faces', `${selected} / ${total}`);
					}
					if (selection_mode == 'edge') {
						let total = 0, selected = 0;
						Mesh.selected.forEach(mesh => {
							let selected_vertices = mesh.getSelectedVertices();
							let processed_lines = [];
							mesh.forAllFaces(face => {
								let vertices = face.getSortedVertices();
								vertices.forEach((vkey, i) => {
									let vkey2 = vertices[i+1] || vertices[0];
									if (!processed_lines.find(processed => processed.includes(vkey) && processed.includes(vkey2))) {
										processed_lines.push([vkey, vkey2]);
										total += 1;
										if (selected_vertices.includes(vkey) && selected_vertices.includes(vkey2)) {
											selected += 1;
										}
									}
								})
							})
						})
						this.selection_info = tl('status_bar.selection.edges', `${selected} / ${total}`);
					}
					if (selection_mode == 'vertex') {
						let total = 0, selected = 0;
						Mesh.selected.forEach(mesh => total += Object.keys(mesh.vertices).length);
						Mesh.selected.forEach(mesh => selected += mesh.getSelectedVertices().length);
						this.selection_info = tl('status_bar.selection.vertices', `${selected} / ${total}`);
					}
				} else {
					this.selection_info = '';
				}
			},
			toggleSidebar: Interface.toggleSidebar,
			getIconNode: Blockbench.getIconNode
		},
		template: `
			<div id="status_bar" @contextmenu="showContextMenu($event)">
				<div class="sidebar_toggle_button" v-if="!isMobile" @click="toggleSidebar('left')" title="${tl('status_bar.toggle_sidebar')}">
					<i class="material-icons">{{Prop.show_left_bar ? 'chevron_left' : 'chevron_right'}}</i>
				</div>
				
				<div class="f_left" v-if="streamer_mode"
					style="background-color: var(--color-stream); color: var(--color-light);"
					@click="toggleStreamerMode()"
					title="${tl('interface.streamer_mode_on')}"
				>
					<i class="material-icons">live_tv</i>
				</div>
				<div v-if="Format" v-html="getIconNode(Format.icon).outerHTML" v-bind:title="Format.name"></div>
				<div v-if="Prop.recording" v-html="getIconNode('fiber_manual_record').outerHTML" style="color: var(--color-close)" title="${tl('status_bar.recording')}"></div>


				<div id="status_name">
					{{ Prop.file_name }}
				</div>
				<div id="status_message" class="hidden"></div>
				<div class="status_selection_info">{{ selection_info }}</div>
				<div class="f_right">
					{{ Prop.fps }} FPS
				</div>

				<div class="sidebar_toggle_button" v-if="!isMobile" @click="toggleSidebar('right')" title="${tl('status_bar.toggle_sidebar')}">
					<i class="material-icons">{{Prop.show_right_bar ? 'chevron_right' : 'chevron_left'}}</i>
				</div>

				<div id="status_progress" v-if="Prop.progress" v-bind:style="{width: Prop.progress*100+'%'}"></div>
			</div>
		`
	})
})
