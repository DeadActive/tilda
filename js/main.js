function State(initialState, constraints, inputs, cb) {
    const inputsMap = {}
    inputs.forEach(input => inputsMap[input.dataset.input] = input)

    Object.entries(initialState).forEach(([key, value]) => {
        Object.defineProperty(this, key, {
            get() {
                return parseInt(inputsMap[key].value)
            },
            set(value) {
                inputsMap[key].value = matchConstraint(value, constraints[key])
                cb(this)
            }
        })

        inputsMap[key].addEventListener('input', (e) => {
            if (isMatchConstraint(e.target.value, constraints[key])) {
                this[key] = matchConstraint(e.target.value, constraints[key])
                inputsMap[key].classList.remove('error')
                return
            }
            inputsMap[key].classList.add('error')
        })

        inputsMap[key].addEventListener('keypress', (e) => {
            if (/^\d+$/.test(e.key)) return
            e.preventDefault()
        })

        this[key] = value
    })

    return this
}

function matchConstraint(value, constraint) {
    const [min, max] = constraint

    if (value >= min && value <= max) return value
    if (value < min) return min
    if (value > max) return max
}

function isMatchConstraint(value, constraint) {
    const [min, max] = constraint

    if (value >= min && value <= max) return true
    return false
}

function showPaddings(side) {
    if (side === 'top') {

    }
}

(document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input[data-input]')

    const gridContainer = document.querySelector('.grid-wrapper')
    const grid = document.getElementById('grid')
    const linesContainer = document.querySelector('.lines-container')
    const sectionsContainer = document.querySelector('.blocks-container')

    const rootEl = document.querySelector(':root')

    function setProperty(property, value) {
        rootEl.style.setProperty(property, value)
    }

    const initialState = {
        width: 150,
        height: 200,
        baseline: 7,
        paddingLeft: 2,
        paddingRight: 2,
        paddingTop: 2,
        paddingBottom: 2,
        columnCount: 5,
        rowsCount: 5,
        gutter: 1,
        rowGap: 1
    }

    const constraints = {
        width: [10, 10000],
        height: [10, 10000],
        baseline: [1, 100],
        paddingLeft: [0, 1000],
        paddingRight: [0, 1000],
        paddingTop: [0, 1000],
        paddingBottom: [0, 1000],
        columnCount: [1, 50],
        rowsCount: [1, 50],
        gutter: [0, 25],
        rowGap: [0, 25]
    }

    function fitContainer(state) {
        const { width, height } = state
        const containerHeight = gridContainer.clientHeight
        const containerWidth = gridContainer.clientWidth

        const gridAR = width / height
        const containerAR = containerWidth / containerHeight

        // save 
        state.gridAR = gridAR
        state.containerAR = containerAR

        const gridWidth = containerAR > gridAR ? width * containerHeight / height : containerWidth
        const gridHeight = containerAR > gridAR ? containerHeight : height * containerWidth / width

        grid.style.width = gridWidth + 'px'
        grid.style.height = gridHeight + 'px'
    }

    function drawLines(state) {
        const { width, height, baseline, gridAR, containerAR } = state

        const stretchY = containerAR > gridAR ? gridContainer.clientHeight / height : gridContainer.clientWidth / width
        state.stretchY = stretchY

        const baseChildCount = Math.floor(height / baseline)
        const linesChildren = linesContainer.children

        const baselinePx = baseline * stretchY + 'px'
        setProperty('--baseline', baselinePx)

        if (!linesChildren.length) {
            const fragment = document.createDocumentFragment()

            for (let i = 0; i < baseChildCount; i++) {
                const el = document.createElement('div')
                el.classList.add('block')

                fragment.appendChild(el)
            }

            linesContainer.appendChild(fragment)
            return
        }

        if (linesChildren.length === baseChildCount) return

        const countDiff = baseChildCount - linesChildren.length

        if (countDiff > 0) {

            for (let i = 0; i < countDiff; i++) {
                const el = document.createElement('div')
                el.classList.add('block')
                linesContainer.append(el)
            }

        }
        if (countDiff < 0) {
            for (let i = countDiff; i < 0; i++) {
                linesContainer.removeChild(linesContainer.lastChild)
            }
        }
    }

    function updatePaddings(state) {
        const { stretchY,
            paddingLeft,
            paddingRight,
            paddingTop,
            paddingBottom, width, height, baseline } = state

        setProperty('--pad-left', paddingLeft * stretchY * baseline + 'px')
        setProperty('--pad-right', paddingRight * stretchY * baseline + 'px')
        setProperty('--pad-top', paddingTop * stretchY * baseline + 'px')
        setProperty('--pad-bottom', paddingBottom * stretchY * baseline + 'px')
    }

    function updateSections(state) {
        const { stretchY, width, height, paddingLeft, paddingRight, paddingTop, paddingBottom, columnCount, gutter, rowsCount, rowGap, baseline } = state

        const containerWidth = width - (paddingLeft + paddingRight) * baseline
        const containerHeight = height - (paddingTop + paddingBottom) * baseline

        const columnWidth = (containerWidth - (gutter * baseline * (columnCount - 1))) / columnCount;
        let rowHeight = (containerHeight - (rowGap * baseline * (rowsCount - 1))) / rowsCount;

        rowHeight = Math.floor(rowHeight / baseline) * baseline

        setProperty('--column-width', columnWidth * stretchY + 'px')
        setProperty('--row-height', rowHeight * stretchY + 'px')
        setProperty('--gutter', gutter * baseline * stretchY + 'px')
        setProperty('--row-gap', rowGap * baseline * stretchY + 'px')

        function createRows(root, count) {
            for (let i = 0; i < count; i++) {
                const el = document.createElement('div')
                el.classList.add('row')
                if (rowGap <= 0) el.classList.add('no-gap')

                root.appendChild(el)
            }
        }

        sectionsContainer.innerHTML = ''
        const fragment = document.createDocumentFragment()

        for (let i = 0; i < columnCount; i++) {
            const el = document.createElement('div')
            el.classList.add('column')

            if (gutter <= 0) el.classList.add('no-gap')

            createRows(el, rowsCount)

            fragment.appendChild(el)
        }

        sectionsContainer.appendChild(fragment)
    }

    function update(state) {
        fitContainer(state)
        drawLines(state)
        updatePaddings(state)
        updateSections(state)
    }

    function valueDragging() {
        var lastMouseCoords = {}
        var isMouseDown = false
        var targetState = null

        // true - horizontal, false - vertical
        const stateDirections = {
            width: true,
            height: false,
            baseline: false,
            paddingLeft: true,
            paddingRight: true,
            paddingTop: false,
            paddingBottom: false,
            columnCount: true,
            rowsCount: false,
            gutter: true,
            rowGap: false
        }

        document.addEventListener('mousedown', e => {
            delta = 0
            lastMouseCoords = {
                x: e.clientX,
                y: e.clientY
            }
            isMouseDown = true
            targetState = e.target.dataset.input
        })

        document.addEventListener('mousemove', e => {
            if (isMouseDown) {

                const dx = e.clientX - lastMouseCoords.x
                const dy = lastMouseCoords.y - e.clientY

                if (targetState)
                    state[targetState] += stateDirections[targetState] ? dx : dy

                lastMouseCoords = {
                    x: e.clientX,
                    y: e.clientY
                }
            }
        })

        document.addEventListener('mouseup', e => {
            isMouseDown = false

        })

    }

    function previewOnHover() {
        // preview on hover
        const hoverEls = document.querySelectorAll('[data-hover]')
        const paddingPreviews = document.querySelectorAll('[data-preview]')
        const previewsMap = {}
        paddingPreviews.forEach(el => previewsMap[el.dataset.preview] = el)

        hoverEls.forEach(el => {
            const key = el.dataset.hover

            el.addEventListener('mouseenter', e => {
                previewsMap[key].classList.toggle('show', true)
            })
            el.addEventListener('mouseleave', e => {
                previewsMap[key].classList.toggle('show', false)
            })
        })
    }

    const state = new State(initialState, constraints, inputs, update)
    window.addEventListener('resize', () => update(state))

    valueDragging()
    previewOnHover()
}))


