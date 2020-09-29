class KeyframeDataPoint {
	constructor(keyframe) {
		switch (keyframe.channel) {
			case 'rotation': 	this.x = this.y = this.z = '0'; break;
			case 'position': 	this.x = this.y = this.z = '0'; break;
			case 'scale': 		this.x = this.y = this.z = '1'; break;
			case 'particle': 	this.effect = this.locator = this.script = this.file = ''; break;
			case 'sound': 		this.effect = this.file = ''; break;
			case 'timeline': 	this.instructions = ''; break;
		}
	}
	extend(data) {
		if (data.values) {
			data.x = data.values.x;
			data.y = data.values.y;
			data.z = data.values.z;
			data.effect = data.values.effect;
			data.locator = data.values.locator;
			data.script = data.values.script;
			data.file = data.values.file;
			data.instructions = data.values.instructions;
		}
		if (this.x != undefined) Merge.string(this, data, 'x')
		if (this.y != undefined) Merge.string(this, data, 'y')
		if (this.z != undefined) Merge.string(this, data, 'z')
		if (this.effect != undefined) 		Merge.string(this, data, 'effect')
		if (this.locator != undefined) 		Merge.string(this, data, 'locator')
		if (this.script != undefined) 		Merge.string(this, data, 'script')
		if (this.file != undefined) 		Merge.string(this, data, 'file')
		if (this.instructions != undefined)	Merge.string(this, data, 'instructions')
	}
	get x_string() {
		return typeof this.x == 'number' ? trimFloatNumber(this.x) || '0' : this.x;
	}
	set x_string(val) {
		this.x = val;
	}
	get y_string() {
		return typeof this.y == 'number' ? trimFloatNumber(this.y) || '0' : this.y;
	}
	set y_string(val) {
		this.y = val;
	}
	get z_string() {
		return typeof this.z == 'number' ? trimFloatNumber(this.z) || '0' : this.z;
	}
	set z_string(val) {
		this.z = val;
	}
}
class Keyframe {
	constructor(data, uuid) {
		this.type = 'keyframe'
		this.uuid = (uuid && isUUID(uuid)) ? uuid : guid();
		this.channel == 'rotation'
		this.selected = 0;
		this.data_points = []

		for (var key in Keyframe.properties) {
			Keyframe.properties[key].reset(this);
		}

		if (typeof data === 'object') {
			Merge.string(this, data, 'channel')
			this.transform = this.channel === 'rotation' || this.channel === 'position' || this.channel === 'scale';
			this.data_points.push(new KeyframeDataPoint(this));
			this.extend(data)
		}
	}
	extend(data) {
		for (var key in Keyframe.properties) {
			Keyframe.properties[key].merge(this, data)
		}
		if (data.data_points && data.data_points.length) {
			this.data_points.splice(data.data_points.length);
			data.data_points.forEach((point, i) => {
				if (!this.data_points[i]) {
					this.data_points.push(new KeyframeDataPoint(this));
				}
				let this_point = this.data_points[i];
				this_point.extend(point)
			})
		}
		return this;
	}
	get(axis, data_point = 0) {
		data_point = this.data_points[data_point];
		if (!data_point || !data_point[axis]) {
			return this.transform ? 0 : '';
		} else if (!isNaN(data_point[axis])) {
			let num = parseFloat(data_point[axis]);
			return isNaN(num) ? 0 : num;
		} else {
			return data_point[axis]
		}
	}
	calc(axis, data_point = 0) {
		data_point = this.data_points[data_point];
		return Molang.parse(data_point && data_point[axis])
	}
	set(axis, value, data_point = 0) {
		if (this.data_points[data_point]) {
			this.data_points[data_point][axis] = value;
		}
		return this;
	}
	offset(axis, amount, data_point = 0) {
		var value = this.get(axis)
		if (!value || value === '0') {
			this.set(axis, amount, data_point)
			return amount;
		}
		if (typeof value === 'number') {
			this.set(axis, value+amount, data_point)
			return value+amount
		}
		var start = value.match(/^-?\s*\d*(\.\d+)?\s*(\+|-)/)
		if (start) {
			var number = parseFloat( start[0].substr(0, start[0].length-1) ) + amount
			value = trimFloatNumber(number) + value.substr(start[0].length-1)
		} else {

			var end = value.match(/(\+|-)\s*\d*(\.\d+)?\s*$/)
			if (end) {
				var number = (parseFloat( end[0] ) + amount)
				value = value.substr(0, end.index) + ((number.toString()).substr(0,1)=='-'?'':'+') + trimFloatNumber(number)
			} else {
				value = trimFloatNumber(amount) +(value.substr(0,1)=='-'?'':'+')+ value
			}
		}
		this.set(axis, value, data_point)
		return value;
	}
	flip(axis) {
		if (!this.transform || this.channel == 'scale') return this;
		function negate(value) {
			if (!value || value === '0') {
				return value;
			}
			if (typeof value === 'number') {
				return -value;
			}
			var start = value.match(/^-?\s*\d*(\.\d+)?\s*(\+|-)/)
			if (start) {
				var number = parseFloat( start[0].substr(0, start[0].length-1) );
				return trimFloatNumber(-number) + value.substr(start[0].length-1);
			} else {
				return `-(${value})`;
			}
		}
		this.data_points.forEach((data_point, data_point_i) => {
			if (this.channel == 'rotation') {
				for (var i = 0; i < 3; i++) {
					if (i != axis) {
						let l = getAxisLetter(i)
						this.set(l, negate(this.get(l, data_point_i)), data_point_i)
					}
				}
			} else if (this.channel == 'position') {
				let l = getAxisLetter(axis)
				this.set(l, negate(this.get(l, data_point_i)), data_point_i)
			}
		})
		return this;
	}
	getLerp(other, axis, amount, allow_expression) {
		let this_data_point = (this.data_points.length > 1 && this.time < other.time) ? 1 : 0;
		let other_data_point = (other.data_points.length > 1 && this.time > other.time) ? 1 : 0;
		if (allow_expression && this.get(axis, this_data_point) === other.get(axis, other_data_point)) {
			return this.get(axis)
		} else {
			let calc = this.calc(axis, this_data_point);
			return calc + (other.calc(axis, other_data_point) - calc) * amount;
		}
	}
	getCatmullromLerp(before_plus, before, after, after_plus, axis, alpha) {
		var vectors = [];

		if (before_plus) vectors.push(new THREE.Vector2(before_plus.time, before_plus.calc(axis, 0)))
		if (before) 	vectors.push(new THREE.Vector2(before.time, before.calc(axis, 0)))
		if (after) 		vectors.push(new THREE.Vector2(after.time, after.calc(axis, 0)))
		if (after_plus) vectors.push(new THREE.Vector2(after_plus.time, after_plus.calc(axis, 0)))

		var curve = new THREE.SplineCurve(vectors);
		let time = (alpha + (before_plus ? 1 : 0)) / (vectors.length-1);

		return curve.getPoint(time).y;
	}
	getArray(data_point = 0) {
		var arr = [
			this.get('x', data_point),
			this.get('y', data_point),
			this.get('z', data_point),
		]
		arr.forEach((n, i) => {
			if (n.replace) arr[i] = n.replace(/\n/g, '');
		})
		return arr;
	}
	getFixed(data_point = 0) {
		if (this.channel === 'rotation') {
			let fix = this.animator.group.mesh.fix_rotation;
			return new THREE.Quaternion().setFromEuler(new THREE.Euler(
				fix.x - Math.degToRad(this.calc('x', data_point)),
				fix.y - Math.degToRad(this.calc('y', data_point)),
				fix.z + Math.degToRad(this.calc('z', data_point)),
				'ZYX'
			));
		} else if (this.channel === 'position') {
			let fix = this.animator.group.mesh.fix_position;
			return new THREE.Vector3(
				fix.x - this.calc('x', data_point),
				fix.y + this.calc('y', data_point),
				fix.z + this.calc('z', data_point)
			)
		} else if (this.channel === 'scale') {
			return new THREE.Vector3(
				this.calc('x', data_point),
				this.calc('y', data_point),
				this.calc('z', data_point)
			)
		}
	}
	getTimecodeString() {
		let timecode = trimFloatNumber(Timeline.snapTime(this.time, this.animator.animation)).toString();
		if (!timecode.includes('.')) {
			timecode += '.0';
		}
		return timecode;
	}
	compileBedrockKeyframe() {
		if (this.transform) {
			if (this.data_points.length == 1) {
				if (this.interpolation == 'linear') {
					return this.getArray();
				} else {
					return {
						post: this.getArray(),
						lerp_mode: this.interpolation,
					}
				}
			} else {
				return {
					pre:  this.getArray(0),
					post: this.getArray(1),
					lerp_mode: this.interpolation != 'linear' ? this.interpolation : undefined,
				}
			}
		} else if (this.channel == 'timeline') {
			let instructions = [];
			this.data_points.forEach(data_point => {
				if (data_point.instructions) {
					instructions.push(...data_point.instructions.split('\n'));
				}
			})
			return instructions.length <= 1 ? instructions[0] : instructions;
		} else {
			let points = [];
			this.data_points.forEach(data_point => {
				if (data_point.effect) {
					let script = this.script || undefined;
					if (script && !script.match(/;$/)) script += ';';
					points.push({
						effect: data_point.effect,
						locator: data_point.locator || undefined,
						pre_effect_script: script,
					})
				}
			})
			return points.length <= 1 ? points[0] : points;
		}
	}
	replaceOthers(save) {
		var scope = this;
		var arr = this.animator[this.channel];
		arr.forEach(kf => {
			if (kf != scope && Math.abs(kf.time - scope.time) < 0.0001) {
				save.push(kf);
				kf.remove();
			}
		})
	}
	select(event) {
		var scope = this;
		if (Timeline.dragging_keyframes) {
			Timeline.dragging_keyframes = false
			return this;
		}
		if (!event || (!event.shiftKey && !event.ctrlOrCmd)) {
			Timeline.selected.forEach(function(kf) {
				kf.selected = false
			})
			Timeline.selected.empty()
		}
		if (event && event.shiftKey && Timeline.selected.length) {
			var last = Timeline.selected[Timeline.selected.length-1]
			if (last && last.channel === scope.channel && last.animator == scope.animator) {
				Timeline.keyframes.forEach((kf) => {
					if (kf.channel === scope.channel &&
						kf.animator === scope.animator &&
						Math.isBetween(kf.time, last.time, scope.time) &&
						!kf.selected
					) {
						kf.selected = true
						Timeline.selected.push(kf)
					}
				})
			}
		}
		Timeline.selected.safePush(this);
		if (Timeline.selected.length == 1 && Timeline.selected[0].animator.selected == false) {
			Timeline.selected[0].animator.select()
		}

		var select_tool = true;
		Timeline.selected.forEach(kf => {
			if (kf.channel != scope.channel) select_tool = false;
		})
		this.selected = true
		TickUpdates.keyframe_selection = true;
		if (select_tool) {
			switch (this.channel) {
				case 'rotation': BarItems.rotate_tool.select(); break;
				case 'position': BarItems.move_tool.select(); break;
				case 'scale': BarItems.resize_tool.select(); break;
			}
		}
		return this;
	}
	callPlayhead() {
		Timeline.setTime(this.time)
		Animator.preview()
		return this;
	}
	showContextMenu(event) {
		if (!this.selected) {
			this.select();
		}
		this.menu.open(event, this);
		return this;
	}
	remove() {
		if (this.animator) {
			this.animator[this.channel].remove(this)
		}
		Timeline.selected.remove(this)
	}
	forSelected(fc, undo_tag) {
		if (Timeline.selected.length <= 1 || !Timeline.selected.includes(this)) {
			var edited = [this]
		} else {
			var edited = Timeline.selected
		}
		if (undo_tag) {
			Undo.initEdit({keyframes: edited})
		}
		for (var i = 0; i < edited.length; i++) {
			fc(edited[i])
		}
		if (undo_tag) {
			Undo.finishEdit(undo_tag)
		}
		return edited;
	}
	getUndoCopy(save) {
		var copy = {
			animator: save ? undefined : this.animator && this.animator.uuid,
			channel: this.channel,
			data_points: []
		}
		if (save) copy.uuid = this.uuid;
		for (var key in Keyframe.properties) {
			Keyframe.properties[key].copy(this, copy)
		}
		this.data_points.forEach(data_point => {
			copy.data_points.push(Object.assign({}, data_point))
		})
		return copy;
	}
}
	Keyframe.prototype.menu = new Menu([
		//Quaternions have been removed in Bedrock 1.10.0
		/*
		{name: 'menu.keyframe.quaternion',
			icon: (keyframe) => (keyframe.isQuaternion ? 'check_box' : 'check_box_outline_blank'),
			condition: (keyframe) => keyframe.channel === 'rotation',
			click: function(keyframe) {
				keyframe.select()
				var state = !keyframe.isQuaternion
				Timeline.keyframes.forEach((kf) => {
					kf.isQuaternion = state
				})
				updateKeyframeSelection()
			}
		},*/
		'change_keyframe_file',
		'_',
		// todo: integrate
		'keyframe_interpolation',
		{name: 'menu.cube.color', icon: 'color_lens', children: [
			{icon: 'bubble_chart', name: 'generic.unset', click: function(kf) {kf.forSelected(kf2 => {kf2.color = -1}, 'change color')}},
			{icon: 'bubble_chart', color: markerColors[0].standard, name: 'cube.color.'+markerColors[0].name, click: function(kf) {kf.forSelected(function(kf2){kf2.color = 0}, 'change color')}},
			{icon: 'bubble_chart', color: markerColors[1].standard, name: 'cube.color.'+markerColors[1].name, click: function(kf) {kf.forSelected(function(kf2){kf2.color = 1}, 'change color')}},
			{icon: 'bubble_chart', color: markerColors[2].standard, name: 'cube.color.'+markerColors[2].name, click: function(kf) {kf.forSelected(function(kf2){kf2.color = 2}, 'change color')}},
			{icon: 'bubble_chart', color: markerColors[3].standard, name: 'cube.color.'+markerColors[3].name, click: function(kf) {kf.forSelected(function(kf2){kf2.color = 3}, 'change color')}},
			{icon: 'bubble_chart', color: markerColors[4].standard, name: 'cube.color.'+markerColors[4].name, click: function(kf) {kf.forSelected(function(kf2){kf2.color = 4}, 'change color')}},
			{icon: 'bubble_chart', color: markerColors[5].standard, name: 'cube.color.'+markerColors[5].name, click: function(kf) {kf.forSelected(function(kf2){kf2.color = 5}, 'change color')}},
			{icon: 'bubble_chart', color: markerColors[6].standard, name: 'cube.color.'+markerColors[6].name, click: function(kf) {kf.forSelected(function(kf2){kf2.color = 6}, 'change color')}},
			{icon: 'bubble_chart', color: markerColors[7].standard, name: 'cube.color.'+markerColors[7].name, click: function(kf) {kf.forSelected(function(kf2){kf2.color = 7}, 'change color')}}
		]},
		'copy',
		'delete',
	])
	new Property(Keyframe, 'number', 'time')
	new Property(Keyframe, 'number', 'color', {default: -1})
	new Property(Keyframe, 'string', 'interpolation', {default: 'linear'})
	Keyframe.selected = [];
	Keyframe.interpolation = {
		linear: 'linear',
		catmullrom: 'catmullrom',
	}

// Misc Functions
function updateKeyframeValue(axis, value, data_point) {
	Timeline.selected.forEach(function(kf) {
		kf.set(axis, value, data_point);
	})
	if (!['effect', 'locator', 'script'].includes(axis)) {
		Animator.preview();
	}
}
function updateKeyframeSelection() {
	Timeline.keyframes.forEach(kf => {
		if (kf.selected && !Timeline.selected.includes(kf)) {
			kf.selected = false;
		}
	})
	if (Timeline.selected.length) {
		BarItems.slider_keyframe_time.update()
		BarItems.keyframe_interpolation.set(Timeline.selected[0].interpolation)
	}
	BARS.updateConditions()
	Blockbench.dispatchEvent('update_keyframe_selection');
}
function selectAllKeyframes() {
	if (!Animation.selected) return;
	var state = Timeline.selected.length !== Timeline.keyframes.length
	Timeline.keyframes.forEach((kf) => {
		if (state && !kf.selected) {
			Timeline.selected.push(kf)
		} else if (!state && kf.selected) {
			Timeline.selected.remove(kf)
		}
		kf.selected = state
	})
	updateKeyframeSelection()
}
function removeSelectedKeyframes() {
	Undo.initEdit({keyframes: Timeline.selected})
	var i = Timeline.keyframes.length;
	while (i > 0) {
		i--;
		let kf = Timeline.keyframes[i]
		if (Timeline.selected.includes(kf)) {
			kf.remove()
		}
	}
	updateKeyframeSelection()
	Animator.preview()
	Undo.finishEdit('remove keyframes')
}

BARS.defineActions(function() {
	new Action('add_keyframe', {
		icon: 'add_circle',
		category: 'animation',
		condition: {modes: ['animate']},
		keybind: new Keybind({key: 81, shift: null}),
		click: function (event) {
			var animator = Timeline.selected_animator;
			if (!animator) return;
			var channel = animator.channels[0];
			if (Toolbox.selected.id == 'rotate_tool' && animator.channels.includes('rotation')) channel = 'rotation';
			if (Toolbox.selected.id == 'move_tool' && animator.channels.includes('position')) channel = 'position';
			if (Toolbox.selected.id == 'resize_tool' && animator.channels.includes('scale')) channel = 'scale';
			animator.createKeyframe((event && event.shiftKey) ? {} : null, Timeline.time, channel, true);
			if (event && event.shiftKey) {
				Animator.preview();
			}
		}
	})

	new Action('move_keyframe_back', {
		icon: 'arrow_back',
		category: 'transform',
		condition: {modes: ['animate'], method: () => (!open_menu && Timeline.selected.length)},
		keybind: new Keybind({key: 37}),
		click: function (e) {
			Undo.initEdit({keyframes: Timeline.selected})
			Timeline.selected.forEach((kf) => {
				kf.time = Timeline.snapTime(limitNumber(kf.time - Timeline.getStep(), 0, 1e4))
			})
			Animator.preview()
			Undo.finishEdit('move keyframes')
		}
	})
	new Action('move_keyframe_forth', {
		icon: 'arrow_forward',
		category: 'transform',
		condition: {modes: ['animate'], method: () => (!open_menu && Timeline.selected.length)},
		keybind: new Keybind({key: 39}),
		click: function (e) {
			Undo.initEdit({keyframes: Timeline.selected})
			Timeline.selected.forEach((kf) => {
				kf.time = Timeline.snapTime(limitNumber(kf.time + Timeline.getStep(), 0, 1e4))
			})
			Animator.preview()
			Undo.finishEdit('move keyframes')
		}
	})
	new Action('previous_keyframe', {
		icon: 'fa-arrow-circle-left',
		category: 'animation',
		condition: {modes: ['animate']},
		click: function () {

			var time = Timeline.time;
			function getDelta(kf, abs) {
				return kf.time - time
			}
			let animator = Timeline.selected_animator
						|| (Timeline.selected[0] && Timeline.selected[0].animator)
						|| Timeline.animators[0];
			let channel = Timeline.selected[0] ? Timeline.selected[0].channel : (animator && animator.channels[0]);
			
			var matches = []
			for (var kf of Timeline.keyframes) {
				if ((!animator || animator == kf.animator) && (!channel || channel == kf.channel)) {
					let delta = getDelta(kf)
					if (delta < 0) {
						matches.push(kf)
					}
				}
			}
			matches.sort((a, b) => {
				return Math.abs(getDelta(a)) - Math.abs(getDelta(b))
			})
			var kf = matches[0]
			if (kf) {
				kf.select().callPlayhead()
			} else {
				if (Timeline.selected.length) {
					selectAllKeyframes()
					selectAllKeyframes()
				}
				Timeline.setTime(0)
				Animator.preview()
			}
		}
	})
	new Action('next_keyframe', {
		icon: 'fa-arrow-circle-right',
		category: 'animation',
		condition: {modes: ['animate']},
		click: function () {

			var time = Timeline.time;
			function getDelta(kf, abs) {
				return kf.time - time
			}
			let animator = Timeline.selected_animator
						|| (Timeline.selected[0] && Timeline.selected[0].animator)
						|| Timeline.animators[0];
			let channel = Timeline.selected[0] ? Timeline.selected[0].channel : (animator && animator.channels[0]);

			var matches = []
			for (var kf of Timeline.keyframes) {
				if ((!animator || animator == kf.animator) && (!channel || channel == kf.channel)) {
					let delta = getDelta(kf)
					if (delta > 0) {
						matches.push(kf)
					}
				}
			}
			matches.sort((a, b) => {
				return Math.abs(getDelta(a)) - Math.abs(getDelta(b))
			})
			var kf = matches[0]
			if (kf) {
				kf.select().callPlayhead()
			}
		}
	})

	new NumSlider('slider_keyframe_time', {
		category: 'animation',
		condition: () => Animator.open && Timeline.selected.length,
		getInterval(event) {
			if (event && event.shiftKey) return 1;
			return Timeline.getStep()
		},
		get: function() {
			return Timeline.selected[0] ? Timeline.selected[0].time : 0
		},
		change: function(modify) {
			Timeline.selected.forEach((kf) => {
				kf.time = Timeline.snapTime(limitNumber(modify(kf.time), 0, 1e4))
			})
			Animator.preview()
		},
		onBefore: function() {
			Undo.initEdit({keyframes: Timeline.selected})
		},
		onAfter: function() {
			Undo.finishEdit('move keyframes')
		}
	})
	new BarSelect('keyframe_interpolation', {
		category: 'animation',
		condition: () => Animator.open && Timeline.selected.length && Timeline.selected.find(kf => kf.transform),
		options: {
			linear: true,
			catmullrom: true,
		},
		onChange: function(sel, event) {
			Undo.initEdit({keyframes: Timeline.selected})
			Timeline.selected.forEach((kf) => {
				if (kf.transform) kf.interpolation = sel.value;
			})
			Undo.finishEdit('change keyframes interpolation')
		}
	})
	new Action('reset_keyframe', {
		icon: 'replay',
		category: 'animation',
		condition: () => Animator.open && Timeline.selected.length,
		click: function () {
			Undo.initEdit({keyframes: Timeline.selected})
			Timeline.selected.forEach((kf) => {
				kf.data_points.replace([new KeyframeDataPoint(kf)]);
			})
			Undo.finishEdit('reset keyframes')
			updateKeyframeSelection()
			Animator.preview()
		}
	})
	new Action('resolve_keyframe_expressions', {
		icon: 'functions',
		category: 'animation',
		condition: () => Animator.open && Timeline.selected.length,
		click: function () {
			Undo.initEdit({keyframes: Timeline.selected})
			let time_before = Timeline.time;
			Timeline.selected.forEach((kf) => {
				if (kf.animator.fillValues) {
					Timeline.time = kf.time;
					kf.animator.fillValues(kf, null, false);
				}
			})
			Timeline.time = time_before;
			Undo.finishEdit('reset keyframes')
			updateKeyframeSelection()
		}
	})
	new Action('change_keyframe_file', {
		icon: 'fa-file-audio',
		category: 'animation',
		condition: () => (isApp && Animator.open && Timeline.selected.length && Timeline.selected[0].channel == 'sound'),
		click: function () {
			Blockbench.import({
				resource_id: 'animation_audio',
				extensions: ['ogg'],
				type: 'Audio File',
				startpath: Timeline.selected[0].data_points[0]?.file
			}, function(files) {

				// Todo: move to panel
				let {path} = files[0];
				Undo.initEdit({keyframes: Timeline.selected})
				Timeline.selected.forEach((kf) => {
					if (kf.channel == 'sound') {
						kf.data_points.forEach(data_point => {
							data_point.file = path;
						})
					}
				})
				Timeline.visualizeAudioFile(path);
				Undo.finishEdit('changed keyframe audio file')
			})
		}
	})
	new Action('reverse_keyframes', {
		icon: 'swap_horizontal_circle',
		category: 'animation',
		condition: () => Animator.open && Timeline.selected.length,
		click: function () {
			var start = 1e9;
			var end = 0;
			Timeline.selected.forEach((kf) => {
				start = Math.min(start, kf.time);
				end = Math.max(end, kf.time);
			})
			Undo.initEdit({keyframes: Timeline.selected})
			Timeline.selected.forEach((kf) => {
				kf.time = end + start - kf.time;
			})
			Undo.finishEdit('reverse keyframes')
			updateKeyframeSelection()
			Animator.preview()
		}
	})
})

Interface.definePanels(function() {
	
	Interface.Panels.keyframe = new Panel({
		id: 'keyframe',
		icon: 'timeline',
		condition: {modes: ['animate']},
		toolbars: {
			head: Toolbars.keyframe
		},
		component: {
			name: 'panel-keyframe',
			components: {VuePrismEditor},
			data() { return {
				keyframes: Timeline.selected
			}},
			methods: {
				updateInput(axis, value, data_point) {
					updateKeyframeValue(axis, value, data_point)
				},
				getKeyframeInfos() {
					let list =  [tl('timeline.'+this.channel)];
					if (this.keyframes.length > 1) list.push(this.keyframes.length);
					/*if (this.keyframes[0].color >= 0) {
						list.push(tl(`cube.color.${markerColors[this.keyframes[0].color].name}`))
					}*/
					return list.join(', ')
				},
				addDataPoint() {
					Undo.initEdit({keyframes: Timeline.selected})
					Timeline.selected.forEach(kf => {
						if ((kf.transform && kf.data_points.length <= 1) || kf.channel == 'particle' || kf.channel == 'sound') {
							kf.data_points.push(new KeyframeDataPoint(kf))
							kf.data_points.last().extend(kf.data_points[0])
						}
					})
					Animator.preview()
					Undo.finishEdit('add keyframe data point')
				},
				removeDataPoint(data_point) {
					Undo.initEdit({keyframes: Timeline.selected})
					Timeline.selected.forEach(kf => {
						if (kf.data_points.length >= 2) {
							kf.data_points.splice(data_point, 1);
						}
					})
					Animator.preview()
					Undo.finishEdit('remove keyframe data point')
				}
			},
			computed: {
				channel() {
					var channel = false;
					for (var kf of this.keyframes) {
						if (channel === false) {
							channel = kf.channel
						} else if (channel !== kf.channel) {
							channel = false
							break;
						}
					}
					return channel;
				}
			},
			template: `
				<div>
					<div class="toolbar_wrapper keyframe"></div>

					<template v-if="channel != false">

						<div id="keyframe_type_label">
							<label>{{ tl('panel.keyframe.type', [getKeyframeInfos()]) }}</label>
							<div
								class="in_list_button"
								v-if="(keyframes[0].transform && keyframes[0].data_points.length <= 1) || channel == 'particle' || channel == 'sound'"
								v-on:click.stop="addDataPoint()"
								title="${ tl('panel.keyframe.add_data_point') }"
							>
								<i class="material-icons">add</i>
							</div>
						</div>

						<ul class="list">

							<div v-for="(data_point, data_point_i) of keyframes[0].data_points" class="keyframe_data_point">

								<div class="keyframe_data_point_header" v-if="keyframes[0].data_points.length > 1">
									<label>{{ keyframes[0].transform ? tl('panel.keyframe.' + (data_point_i ? 'post' : 'pre')) : (data_point_i + 1) }}</label>
									<div class="flex_fill_line"></div>
									<div class="in_list_button" v-on:click.stop="removeDataPoint(data_point)" title="${ tl('panel.keyframe.remove_data_point') }">
										<i class="material-icons">clear</i>
									</div>
								</div>

								<div class="bar flex" id="keyframe_bar_x" v-if="keyframes[0].animator instanceof BoneAnimator">
									<label class="color_x" style="font-weight: bolder">X</label>
									<vue-prism-editor class="molang_input dark_bordered keyframe_input tab_target" v-model="data_point.x_string" @change="updateInput('x', $event, data_point_i)" language="molang" :line-numbers="false" />
								</div>
								<div class="bar flex" id="keyframe_bar_y" v-if="keyframes[0].animator instanceof BoneAnimator">
									<label class="color_y" style="font-weight: bolder">Y</label>
									<vue-prism-editor class="molang_input dark_bordered keyframe_input tab_target" v-model="data_point.y_string" @change="updateInput('y', $event, data_point_i)" language="molang" :line-numbers="false" />
								</div>
								<div class="bar flex" id="keyframe_bar_z" v-if="keyframes[0].animator instanceof BoneAnimator">
									<label class="color_z" style="font-weight: bolder">Z</label>
									<vue-prism-editor class="molang_input dark_bordered keyframe_input tab_target" v-model="data_point.z_string" @change="updateInput('z', $event, data_point_i)" language="molang" :line-numbers="false" />
								</div>

								<div class="bar flex" id="keyframe_bar_effect" v-if="channel == 'particle' || channel == 'sound'">
									<label>${ tl('data.effect') }</label>
									<input type="text" class="dark_bordered code keyframe_input tab_target" v-model="data_point.effect" @input="updateInput('effect', $event.target.value, data_point_i)">
								</div>
								<div class="bar flex" id="keyframe_bar_locator" v-if="channel == 'particle'">
									<label>${ tl('data.locator') }</label>
									<input  type="text" class="dark_bordered code keyframe_input tab_target" v-model="data_point.locator" @input="updateInput('locator', $event.target.value, data_point_i)">
								</div>
								<div class="bar flex" id="keyframe_bar_script" v-if="channel == 'particle'">
									<label>${ tl('timeline.pre_effect_script') }</label>
									<vue-prism-editor class="molang_input dark_bordered keyframe_input tab_target" v-model="data_point.script" @change="updateInput('script', $event, data_point_i)" language="molang" :line-numbers="false" />
								</div>
								<div class="bar" id="keyframe_bar_instructions" v-if="channel == 'timeline'">
									<vue-prism-editor class="molang_input dark_bordered keyframe_input tab_target" v-model="data_point.instructions" @change="updateInput('instructions', $event, data_point_i)" language="molang" :line-numbers="false" />
								</div>
							</div>
						</ul>
					</template>
				</div>
			`
		}
	})
})