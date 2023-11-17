/*
	Book Source

	Copyright (c) 2023 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const HtmlRenderer = require( './HtmlRenderer.js' ) ;

const emoji = require( 'string-kit/lib/emoji.js' ) ;
//const string = require( 'string-kit' ) ;



function StructuredText() {
	this.parts = [] ;
}

module.exports = StructuredText ;



StructuredText.prototype.toHtml = function( params ) {
	return this.render( new HtmlRenderer( params ) ) ;
} ;



StructuredText.prototype.render = function( renderer ) {
	var meta = {} ,
		str = '' ;

	if ( renderer.start ) {
		str += renderer.start( meta ) ;
	}

	str += this.renderParts( renderer , this.parts ) ;

	if ( renderer.end ) {
		str += renderer.end( meta ) ;
	}

	return str ;
} ;



StructuredText.prototype.renderParts = function( renderer , parts ) {
	var str = '' ;

	for ( let part of parts ) {
		let childrenStr = '' ;

		if ( part.children ) {
			childrenStr = this.renderParts( renderer , part.children ) ;
		}

		if ( renderer[ part.type ] ) {
			str += renderer[ part.type ]( part , childrenStr ) ;
		}
	}

	return str ;
} ;



// Parser

StructuredText.parse = function( str , options ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var runtime = {
		i: 0 ,
		iStartOfInlineChunk: 0 ,
		structuredText: new StructuredText() ,
		stack: [] ,
		parts: null ,
		parent: null
	} ;

	runtime.parts = runtime.structuredText.parts ;

	if ( typeof str !== 'string' ) {
		if ( str && typeof str === 'object' ) { str = str.toString() ; }
		else { throw new TypeError( "Argument #0 should be a string or an object with a .toString() method" ) ; }
	}

	parseBlocks( str , runtime ) ;

	// Call depthManagement() one last time, because some instanceOf may still be hanging...
	//runtime.depth = -1 ;
	//depthManagement( runtime ) ;

	return runtime.structuredText ;
} ;



function parseBlocks( str , runtime ) {
	while ( runtime.i < str.length ) {
		parseBlock( str , runtime ) ;
	}
}



function parseQuote( str , runtime , indent ) {
	console.error( "parseQuote:" , runtime.i , str.slice( runtime.i ) ) ;
	runtime.parts.push( { type: 'quote' , indent } ) ;
	stack( runtime ) ;
	return ;

	var blockEnd = detectBlockEnd( str , runtime.i , runtime.parent?.indent , BLOCK_QUOTE_IN ) ;
	parseInlineChildren( str , runtime , blockEnd ) ;

	//console.error( "children:" , children ) ;
	//console.error( "parseParagraph out:" , runtime.i , str.slice( runtime.i ) ) ;
}

function parseBlock( str , runtime ) {
	var { isEmptyLine , endOfEmptyLine , indentCharCount , indentSpaces } = detectIndent( str , runtime.i , runtime.parent?.indent ) ;

	if ( isEmptyLine ) {
		runtime.i ++ ;
		runtime.i = endOfEmptyLine + 1 ;
		return ;
	}

	var blockType = detectBlockType( str , runtime.i , runtime.parent?.indent ) ;
	console.error( "Block type code:" , blockType ) ;
	
	
	unstackToIndent( runtime , indentSpaces ) ;

	//runtime.i += indentCharCount ;

	switch ( blockType ) {
		case BLOCK_PARAGRAPH :
			parseParagraph( str , runtime ) ;
			break ;
		case BLOCK_HEADER :
			parseHeader( str , runtime ) ;
			break ;
		case BLOCK_LIST :
			runtime.i += indentCharCount ;
			parseList( str , runtime , indentSpaces ) ;
			break ;
		case BLOCK_ORDERED_LIST :
			runtime.i += indentCharCount ;
			parseOrderedList( str , runtime , indentSpaces , detectBlockType.endOfMarkup ) ;
			break ;
		case BLOCK_MEDIA :
			parseMedia( str , runtime ) ;
			break ;
		case BLOCK_FLOAT_LEFT_MEDIA :
			parseMedia( str , runtime , 'left' ) ;
			break ;
		case BLOCK_FLOAT_RIGHT_MEDIA :
			parseMedia( str , runtime , 'right' ) ;
			break ;
		case BLOCK_HORIZONTAL_RULE :
			parseHorizontalRule( str , runtime ) ;
			break ;
		case BLOCK_CLEAR_FLOAT :
			parseClearFloat( str , runtime ) ;
			break ;
		case BLOCK_CODE :
			parseCodeBlock( str , runtime ) ;
			break ;
		case BLOCK_ANCHOR :
			parseAnchor( str , runtime ) ;
			break ;
		case BLOCK_CONTINUE :
			// This is a malformed part
			console.error( "Malformed part, assuming a paragraph" ) ;
			parseParagraph( str , runtime ) ;
			break ;
		default :
			throw new Error( "Bad block detection: " + blockType ) ;
	}
	
	if ( str[ runtime.i ] === '\n' ) {
		runtime.i ++ ;
	}
}



const BLOCK_EMPTY_LINE = 1 ;
const BLOCK_CONTINUE = 2 ;
const BLOCK_PARAGRAPH = 10 ;
const BLOCK_CITE = 13 ;
const BLOCK_HEADER = 14 ;
const BLOCK_LIST = 15 ;
const BLOCK_ORDERED_LIST = 16 ;
const BLOCK_MEDIA = 20 ;
const BLOCK_FLOAT_LEFT_MEDIA = 21 ;
const BLOCK_FLOAT_RIGHT_MEDIA = 22 ;
const BLOCK_HORIZONTAL_RULE = 30 ;
const BLOCK_CLEAR_FLOAT = 31 ;
const BLOCK_CODE = 40 ;
const BLOCK_ANCHOR = 50 ;



const DETECT_INDENT = {
	isEmptyLine: false ,
	endOfEmptyLine: -1 ,
	indentCharCount: 0 ,
	indentSpaces: 0
} ;

function detectIndent( str , i , parentIndent ) {
	parentIndent = parentIndent || 0 ;

	DETECT_INDENT.isEmptyLine = false ;
	DETECT_INDENT.endOfEmptyLine = -1 ;
	DETECT_INDENT.indentCharCount = DETECT_INDENT.indentSpaces = 0 ;

	if ( str[ i ] === '\n' ) {
		DETECT_INDENT.isEmptyLine = true ;
		DETECT_INDENT.endOfEmptyLine = i ;
		return DETECT_INDENT ;
	}


	var iSearch = i ;

	for ( ; iSearch < str.length ; iSearch ++ ) {
		if ( str[ iSearch ] === '\n' ) {
			DETECT_INDENT.isEmptyLine = true ;
			DETECT_INDENT.endOfEmptyLine = iSearch ;
			return DETECT_INDENT ;
		}

		if ( str[ iSearch ] === '\t' ) {
			DETECT_INDENT.indentCharCount ++ ;
			DETECT_INDENT.indentSpaces += 4 ;
		}
		else if ( str[ iSearch ] === ' ' ) {
			DETECT_INDENT.indentCharCount ++ ;
			DETECT_INDENT.indentSpaces ++ ;
		}
		else {
			break ;
		}
	}

	return DETECT_INDENT ;
}



function detectBlockType( str , i , parentIndent , fromDetectBlockEnd = false ) {
	parentIndent = parentIndent || 0 ;

	if ( str[ i ] === '\n' ) {
		detectBlockType.endOfEmptyLine = i ;
		return BLOCK_EMPTY_LINE ;
	}

	detectBlockType.endOfEmptyLine = -1 ;
	detectBlockType.endOfMarkup = -1 ;
	detectBlockType.indentCharCount = detectBlockType.indentSpaces = 0 ;

	var iSearch = i ;

	for ( ; iSearch < str.length ; iSearch ++ ) {
		if ( str[ iSearch ] === '\n' ) {
			detectBlockType.endOfEmptyLine = iSearch ;
			break ;
		}

		if ( str[ iSearch ] === '\t' ) {
			detectBlockType.indentCharCount ++ ;
			detectBlockType.indentSpaces += 4 ;
		}
		else if ( str[ iSearch ] === ' ' ) {
			detectBlockType.indentCharCount ++ ;
			detectBlockType.indentSpaces ++ ;
		}
		else {
			break ;
		}
	}

	// No end of line found? Set it to the end of content.
	if ( iSearch === str.length ) { detectBlockType.endOfEmptyLine = str.length ; }
	
	
	if ( detectBlockType.endOfEmptyLine >= 0 ) {
		return BLOCK_EMPTY_LINE ;
	}

	var indentDelta = detectBlockType.indentSpaces - parentIndent ;
	console.error( "indentDelta:" , indentDelta ) ;

	if ( indentDelta >= 8 && ! fromDetectBlockEnd ) {
		return BLOCK_QUOTE_IN ;
	}
	else if ( indentDelta <= -8 && ! fromDetectBlockEnd ) {
		return BLOCK_QUOTE_OUT ;
	}

	/*
	console.error( "???" , {
		count: detectBlockType.indentCharCount ,
		spaces: detectBlockType.indentSpaces ,
		strI: str[ i ] ,
		strIAfterIndent: str[ iAfterIndent ] ,
		after: str.slice( iAfterIndent )
	} ) ;
	//*/

	var iAfterIndent = i + detectBlockType.indentCharCount ;

	if ( str[ iAfterIndent ] === '#' ) {
		if ( str[ iAfterIndent + 1 ] === '(' ) { return BLOCK_ANCHOR ; }
		if ( ! detectBlockType.indentSpaces ) { return BLOCK_HEADER ; }
		return BLOCK_PARAGRAPH ;
	}

	if ( str[ iAfterIndent ] === '!' && str[ iAfterIndent + 2 ] === '[' ) {
		if ( str[ iAfterIndent + 1 ] === '=' ) { return BLOCK_MEDIA ; }
		else if ( str[ iAfterIndent + 1 ] === '<' ) { return BLOCK_FLOAT_LEFT_MEDIA ; }
		else if ( str[ iAfterIndent + 1 ] === '>' ) { return BLOCK_FLOAT_RIGHT_MEDIA ; }
		return BLOCK_PARAGRAPH ;
	}

	if ( ( str[ iAfterIndent ] === '*' || str[ iAfterIndent ] === '-' ) && str[ iAfterIndent + 1 ] === ' ' ) {
		return BLOCK_LIST ;
	}

	if ( str[ iAfterIndent ] === '-' && str[ iAfterIndent + 1 ] === '-' && str[ iAfterIndent + 2 ] === '-' && ! detectBlockType.indentSpaces ) {
		return BLOCK_HORIZONTAL_RULE ;
	}

	if ( str[ iAfterIndent ] === '<' && str[ iAfterIndent + 1 ] === '-' && str[ iAfterIndent + 2 ] === '-' && str[ iAfterIndent + 3 ] === '-' && ! detectBlockType.indentSpaces ) {
		return BLOCK_CLEAR_FLOAT ;
	}

	if ( str[ iAfterIndent ] === '`' && str[ iAfterIndent + 1 ] === '`' && str[ iAfterIndent + 2 ] === '`' && ! detectBlockType.indentSpaces ) {
		return BLOCK_CODE ;
	}

	if ( str[ iAfterIndent ] >= '0' && str[ iAfterIndent ] <= '9' ) {
		let iAfterNumber = iAfterIndent + 1 ;
		while ( str[ iAfterNumber ] >= '0' && str[ iAfterNumber ] <= '9' ) { iAfterNumber ++ ; }

		if ( str[ iAfterNumber ] === '.' && ( str[ iAfterNumber + 1 ] === ' ' || str[ iAfterNumber + 1 ] === '\t' ) ) {
			detectBlockType.endOfMarkup = iAfterNumber ;
			return BLOCK_ORDERED_LIST ;
		}
	}

	if ( indentDelta >= 2 ) {
		return BLOCK_CONTINUE ;
	}

	return BLOCK_PARAGRAPH ;
}

detectBlockType.endOfEmptyLine = 0 ;	// The position of the end of line if the line is empty (-1 if not empty)
detectBlockType.endOfMarkup = -1 ;		// The end of the detected markup, only support by few cases (e.g. ordered list) to avoid parsing twice (-1 if irrelevant)
detectBlockType.indentSpaces = 0 ;		// Indentation space, where tab = 4 spaces
detectBlockType.indentCharCount = 0 ;	// The number of indentation char, used to skip to the first meaningful character



function detectBlockEnd( str , nextScanStart , parentIndent = 0 , acceptBlockType = null ) {
	var detectedBlockType = BLOCK_CONTINUE ,
		blockEnd = nextScanStart ;

	while ( nextScanStart < str.length && ( detectedBlockType === BLOCK_CONTINUE || detectedBlockType === acceptBlockType ) ) {
		let endOfLine = searchEndOfLine( str , nextScanStart ) ;
		blockEnd = endOfLine ;
		nextScanStart = endOfLine + 1 ;

		if ( nextScanStart < str.length ) {
			detectedBlockType = detectBlockType( str , nextScanStart , parentIndent , true ) ;
		}
	}
	
	return blockEnd ;
}



function parseParagraph( str , runtime ) {
	//console.error( "parseParagraph in:" , runtime.i , str.slice( runtime.i ) ) ;
	runtime.parts.push( { type: 'paragraph' } ) ;

	var blockEnd = detectBlockEnd( str , runtime.i , runtime.parent?.indent , BLOCK_PARAGRAPH ) ;
	parseInlineChildren( str , runtime , blockEnd ) ;

	//console.error( "children:" , children ) ;
	//console.error( "parseParagraph out:" , runtime.i , str.slice( runtime.i ) ) ;
}



function parseHeader( str , runtime ) {
	var streak = countStreak( str , runtime.i , '#' ) ;
	//if ( str[ runtime.i + streak ] !== ' ' ) { return parseParagraph( str , runtime ) ; }

	runtime.i += streak ;
	if ( str[ runtime.i ] === ' ' ) { runtime.i ++ ; }
	runtime.parts.push( { type: 'header' , level: streak } ) ;

	var blockEnd = detectBlockEnd( str , runtime.i , runtime.parent?.indent ) ;
	parseInlineChildren( str , runtime , blockEnd ) ;
}



function parseList( str , runtime , indent ) {
	runtime.i += 2 ;

	var lastPart = runtime.parts[ runtime.parts.length - 1 ] ;

	if ( ! lastPart || lastPart.type !== 'list' ) {
		runtime.parts.push( { type: 'list' , indent } ) ;
	}

	stack( runtime ) ;

	runtime.parts.push( { type: 'listItem' , indent } ) ;

	var blockEnd = detectBlockEnd( str , runtime.i , runtime.parent?.indent ) ;
	parseInlineChildren( str , runtime , blockEnd ) ;
}



function parseOrderedList( str , runtime , indent , endOfMarkup ) {
	var order = parseInt( str.slice( runtime.i , endOfMarkup ) , 10 ) ;
	runtime.i = endOfMarkup + 2 ;

	var lastPart = runtime.parts[ runtime.parts.length - 1 ] ;

	if ( ! lastPart || lastPart.type !== 'orderedList' ) {
		runtime.parts.push( { type: 'orderedList' , indent } ) ;
	}

	stack( runtime ) ;

	runtime.parts.push( { type: 'orderedListItem' , indent , order } ) ;

	var blockEnd = detectBlockEnd( str , runtime.i , runtime.parent?.indent ) ;
	parseInlineChildren( str , runtime , blockEnd ) ;
}



const MEDIA_DATA_MARK = { text: true , href: true , style: false , extra: true } ;

function parseMedia( str , runtime , float = null ) {
	//var blockEnd = detectBlockEnd( str , runtime.i , runtime.parent?.indent ) ;
	//var end = searchCloser( str , runtime.i + 3 , '[' , ']' , false , blockEnd ) ;
	var end = searchCloser( str , runtime.i + 3 , '[' , ']' ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( runtime.i + 3 , end ) ;

	runtime.i = end ;
	runtime.iStartOfInlineChunk = runtime.i + 1 ;
	//var data = parseDataMark( str , runtime , MEDIA_DATA_MARK , blockEnd ) ;
	var data = parseDataMark( str , runtime , MEDIA_DATA_MARK ) ;
	if ( ! data ) { return ; }
	
	if ( ! data.href?.length ) { return ; }

	var type = 'imageBlock' ;

	if ( data.href[ 1 ] ) {
		switch ( data.href[ 1 ] ) {
			case 'image' :
				type = 'imageBlock' ;
				break ;
			case 'audio' :
				type = 'audioBlock' ;
				break ;
			case 'video' :
				type = 'videoBlock' ;
				break ;
			default :
				return ;
		}
	}

	var params = { type , altText: text , href: data.href[ 0 ] } ;
	if ( float ) { params.float = float ; }
	if ( data.text?.length ) { params.caption = data.text[ 0 ] ; }
	if ( data.extra?.length ) { params.title = data.extra[ 0 ] ; }
	runtime.parts.push( params ) ;
	runtime.i ++ ;
}



function parseHorizontalRule( str , runtime ) {
	var params = { type: 'horizontalRule' } ,
		blockEnd = detectBlockEnd( str , runtime.i , runtime.parent?.indent ) ,
		streak = countStreak( str , runtime.i , '-' ) ;

	if (
		str[ runtime.i + streak ] === '<'
		&& str[ runtime.i + streak + 1 ] === '>'
		&& str[ runtime.i + streak + 2 ] === '-'
		&& str[ runtime.i + streak + 3 ] === '-'
		&& str[ runtime.i + streak + 4 ] === '-'
	) {
		params.clearFloat = true ;
	}

	runtime.parts.push( params ) ;
	runtime.i = blockEnd ;
}



function parseClearFloat( str , runtime ) {
	var streak = countStreak( str , runtime.i + 1 , '-' ) ;

	if ( str[ runtime.i + 1 + streak ] === '>' ) {
		runtime.parts.push( { type: 'clearFloat' } ) ;
		runtime.i = detectBlockEnd( str , runtime.i , runtime.parent?.indent ) ;
	}
	else {
		parseParagraph( str , runtime ) ;
	}
}



function parseCodeBlock( str , runtime ) {
	var streak = countStreak( str , runtime.i , '`' ) ,
		endOfLine = searchEndOfLine( str , runtime.i + streak ) ,
		lang = str.slice( runtime.i + streak , endOfLine ).trim() || null ,
		contentStart = endOfLine + 1 ;

	var ends = searchBlockSwitchCloser( str , contentStart , '`' , 3 ) ;

	if ( ! ends ) {
		return parseParagraph( str , runtime ) ;
	}

	var [ contentEnd , blockEnd ] = ends ;

	var params = { type: 'codeBlock' } ;
	if ( lang ) { params.lang = lang ; }
	params.text = str.slice( contentStart , contentEnd - 1 ) ;	// We strip the last newline
	runtime.parts.push( params ) ;
	runtime.i = blockEnd ;
}



function parseAnchor( str , runtime ) {
	//console.log( "parseAnchor()" ) ;
	var end = searchCloser( str , runtime.i + 2 , '(' , ')' , true ) ;
	if ( end < 0 ) { return ; }

	runtime.parts.push( {
		type: 'anchor' ,
		href: str.slice( runtime.i + 2 , end )
	} ) ;
	
	runtime.i = end + 1 ;
}



function parseInlineChildren( str , runtime , blockEnd ) {
	stack( runtime ) ;
	parseInline( str , runtime , blockEnd ) ;
	unstack( runtime ) ;
}



// Try to parse non-block content
function parseInline( str , runtime , blockEnd ) {
	//console.log( "parseInline() -- remaining:" , runtime.i , str.slice( runtime.i ) ) ;
	var isSpace ,
		lastWasSpace = WHITE_SPACES.has( str[ runtime.i - 1 ] ) ;
	
	blockEnd = blockEnd ?? searchEndOfLine( str , runtime.i ) ;

	runtime.iStartOfInlineChunk = runtime.i ;

	for ( ; runtime.i < blockEnd ; runtime.i ++ ) {
		let char = str[ runtime.i ] ;

		//if ( lastWasSpace ) {}
		//console.error( "Checking: " , string.inspect( char ) ) ;

		isSpace = WHITE_SPACES.has( char ) ;

		if ( isSpace ) {
			addInlineTextChunk( str , runtime ) ;
			parseWhiteSpace( str , runtime ) ;
		}
		else if ( char === '\\' ) {
			addInlineTextChunk( str , runtime ) ;
			parseEscape( str , runtime ) ;
		}
		else if ( char === '*' && ! WHITE_SPACES.has( str[ runtime.i + 1 ] ) ) {
			addInlineTextChunk( str , runtime ) ;
			parseEmphasis( str , runtime , blockEnd ) ;
		}
		else if ( char === '_' && ! WHITE_SPACES.has( str[ runtime.i + 1 ] ) ) {
			addInlineTextChunk( str , runtime ) ;
			parseDecoration( str , runtime , blockEnd ) ;
		}
		else if ( char === '`' ) {
			addInlineTextChunk( str , runtime ) ;
			parseCode( str , runtime , blockEnd ) ;
		}
		else if ( char === '[' ) {
			addInlineTextChunk( str , runtime ) ;
			parseStyledText( str , runtime , blockEnd ) ;
		}
		else if ( char === '!' && str[ runtime.i + 1 ] === '[' && lastWasSpace ) {
			addInlineTextChunk( str , runtime ) ;
			parseImage( str , runtime , blockEnd ) ;
		}

		lastWasSpace = isSpace ;
	}
	
	addInlineTextChunk( str , runtime ) ;

	runtime.i = blockEnd ;

	if ( str[ runtime.i ] === '\n' ) {
		runtime.i ++ ;
	}
}



function addInlineTextChunk( str , runtime , forcedChunk = null ) {
	var chunk = forcedChunk ?? str.slice( runtime.iStartOfInlineChunk , runtime.i ) ;
	
	if ( chunk ) {
		let lastPart = runtime.parts[ runtime.parts.length - 1 ] ;

		if ( lastPart && lastPart.type === 'text' ) {
			lastPart.text += chunk ;
		}
		else {
			runtime.parts.push( {
				type: 'text' ,
				text: chunk
			} ) ;
		}
	}

	if ( ! forcedChunk ) {
		runtime.iStartOfInlineChunk = runtime.i ;
	}
}



const WHITE_SPACES = new Set( [ ' ' , '\t' , '\n' , '\r' ] ) ;



function parseWhiteSpace( str , runtime ) {
	var end = runtime.i + 1 ;
	while ( WHITE_SPACES.has( str[ end ] ) ) { end ++ ; }

	runtime.i = end - 1 ;
	runtime.iStartOfInlineChunk = runtime.i + 1 ;

	addInlineTextChunk( str , runtime , ' ' ) ;
}



function parseEscape( str , runtime ) {
	if ( runtime.i + 1 >= str.length ) {
		runtime.iStartOfInlineChunk = runtime.i + 1 ;
		return ;
	}

	let char = str[ runtime.i + 1 ] ;

	if ( str[ runtime.i + 1 ] === ' ' ) {
		if ( str[ runtime.i - 1 ] === '\n' ) {
			addInlineTextChunk( str , runtime , '\n' ) ;
		}
		else if ( searchEndOfEmptyLine( str , runtime.i + 2 ) !== -1 ) {
			// Since we are not at the begining of the line, it actually search for trailing white chars
			addInlineTextChunk( str , runtime , '\n' ) ;
		}
		else {
			addInlineTextChunk( str , runtime , ' ' ) ;
		}
	}
	else if ( str[ runtime.i + 1 ] === '\n' ) {
		addInlineTextChunk( str , runtime , '\n' ) ;
	}
	else {
		addInlineTextChunk( str , runtime , str[ runtime.i + 1 ] ) ;
	}

	runtime.i ++ ;
	runtime.iStartOfInlineChunk = runtime.i + 1 ;
}



function parseEmphasis( str , runtime , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , runtime.i , '*' ) ;
	if ( streak > 3 ) { return ; }
	var end = searchSwitchCloser( str , runtime.i + streak , '*' , streak , true , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( runtime.i + streak , end + 1 - streak ) ;

	runtime.parts.push( { type: 'emphasis' , level: streak , text } ) ;
	runtime.i = end ;
	runtime.iStartOfInlineChunk = runtime.i + 1 ;
}



function parseDecoration( str , runtime , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , runtime.i , '_' ) ;
	if ( streak > 2 ) { return ; }
	var end = searchSwitchCloser( str , runtime.i + streak , '_' , streak , true , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( runtime.i + streak , end + 1 - streak ) ;

	runtime.parts.push( { type: 'decoration' , underline: true , level: streak , text } ) ;
	runtime.i = end ;
	runtime.iStartOfInlineChunk = runtime.i + 1 ;
}



function parseCode( str , runtime , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , runtime.i , '`' ) ;
	// Markdown supports inline code inside two pairs of backquote, to allow backquote in code, hence streak can be 2.
	if ( streak > 2 ) { return ; }
	var end = searchSwitchCloser( str , runtime.i + streak , '`' , streak , false , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var sliceStart = runtime.i + streak ,
		sliceEnd = end + 1 - streak ;

	if ( str[ sliceStart ] === ' ' && str[ sliceStart + 1 ] === '`' ) { sliceStart ++ ; }
	if ( str[ sliceEnd - 1 ] === ' ' && str[ sliceEnd - 2 ] === '`' ) { sliceEnd -- ; }

	var text = str.slice( sliceStart , sliceEnd ) ;

	runtime.parts.push( { type: 'code' , text } ) ;
	runtime.i = end ;
	runtime.iStartOfInlineChunk = runtime.i + 1 ;
}



const STYLE_DATA_MARK = { text: false , href: true , style: true , extra: true } ;

function parseStyledText( str , runtime , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var end = searchCloser( str , runtime.i + 1 , '[' , ']' , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( runtime.i + 1 , end ) ;

	runtime.i = end ;
	var data = parseDataMark( str , runtime , STYLE_DATA_MARK , blockEnd ) ;
	if ( ! data ) { return ; }
	
	var params = { type: '' , text } ;
	if ( data.href?.length ) { params.href = data.href[ 0 ] ; }
	if ( data.style?.length ) { params.style = data.style[ 0 ] ; }
	if ( data.extra?.length ) { params.title = data.extra[ 0 ] ; }

	if ( params.href ) {
		params.type = 'link' ;
		runtime.parts.push( params ) ;
	}
	else if ( params.style || params.title ) {
		params.type = 'styledText' ;
		runtime.parts.push( params ) ;
	}
}



const IMAGE_DATA_MARK = { text: true , href: true , style: false , extra: true } ;

function parseImage( str , runtime , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var end = searchCloser( str , runtime.i + 2 , '[' , ']' , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( runtime.i + 2 , end ) ;

	runtime.i = end ;
	runtime.iStartOfInlineChunk = runtime.i + 1 ;
	var data = parseDataMark( str , runtime , IMAGE_DATA_MARK , blockEnd ) ;
	if ( ! data ) { return ; }
	
	var params = { type: '' , altText: text } ;
	if ( data.href?.length ) { params.href = data.href[ 0 ] ; }
	if ( data.extra?.length ) { params.title = data.extra[ 0 ] ; }
	
	if ( params.href ) {
		params.type = 'image' ;
		params.altText = text ;
		runtime.parts.push( params ) ;
	}
	else {
		params.type = 'pictogram' ;
		params.code = text ;
		let emojiChar = emoji.get( text ) ;
		if ( emojiChar ) { params.emoji = emojiChar ; }

		if ( data.text?.length ) { params.altText = data.text[ 0 ] ; }
		else if ( emojiChar ) { params.altText = emoji.getCanonicalName( emojiChar ) ; }

		runtime.parts.push( params ) ;
	}
}



function parseDataMark( str , runtime , allow , blockEnd ) {
	var end ,
		data = {} ;

	for ( ;; ) {
		if ( str[ runtime.i + 1 ] === '[' && allow.text ) {
			end = searchCloser( str , runtime.i + 2 , '[' , ']' , false , blockEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.text ) { data.text = [] ; }
			data.text.push( str.slice( runtime.i + 2 , end ) ) ;
			runtime.i = end ;
			runtime.iStartOfInlineChunk = runtime.i + 1 ;
		}
		else if ( str[ runtime.i + 1 ] === '(' && allow.href ) {
			end = searchCloser( str , runtime.i + 2 , '(' , ')' , true , blockEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.href ) { data.href = [] ; }
			data.href.push( str.slice( runtime.i + 2 , end ) ) ;
			runtime.i = end ;
			runtime.iStartOfInlineChunk = runtime.i + 1 ;
		}
		else if ( str[ runtime.i + 1 ] === '<' && allow.style ) {
			end = searchCloser( str , runtime.i + 2 , '<' , '>' , true , blockEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.style ) { data.style = [] ; }
			data.style.push( str.slice( runtime.i + 2 , end ) ) ;
			runtime.i = end ;
			runtime.iStartOfInlineChunk = runtime.i + 1 ;
		}
		else if ( str[ runtime.i + 1 ] === '{' && allow.extra ) {
			end = searchCloser( str , runtime.i + 2 , '{' , '}' , false , blockEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.extra ) { data.extra = [] ; }
			data.extra.push( str.slice( runtime.i + 2 , end ) ) ;
			runtime.i = end ;
			runtime.iStartOfInlineChunk = runtime.i + 1 ;
		}
		else {
			break ;
		}
	}

	return data ;
}



function searchEndOfLine( str , i ) {
	var length = str.length ;

	for ( ; i < length ; i ++ ) {
		if ( str[ i ] === '\n' ) { return i ; }
	}

	return str.length ;
}



// Like searchEndOfLine() but return -1 if it's not an empty line (a line containing characters that are not space or tabs)
function searchEndOfEmptyLine( str , i ) {
	var length = str.length ;

	for ( ; i < length ; i ++ ) {
		if ( str[ i ] === '\n' ) { return i ; }
		if ( str[ i ] !== '\t' && str[ i ] !== ' ' ) { return -1 ; }
	}

	return str.length ;
}



function searchCloser( str , i , opener , closer , inline = false , end = str.length ) {
	var opened = 1 ;

	for ( ; i < end ; i ++ ) {
		if ( inline && str[ i ] === '\n' ) { break ; }

		if ( str[ i ] === opener ) {
			opened ++ ;
		}
		else if ( str[ i ] === closer ) {
			opened -- ;
			if ( ! opened ) { return i ; }
		}
	}

	return -1 ;
}



/*
	Same that searchCloser() but for things like '*' that starts and stop with the same amount of '*'.

	closerStreak: number of times the closer char should repeat
	noSpaceBefore: no space should be present right before the closer
	inline: true if it doesn't span over multiple lines
	end: the position in the string where to stop scanning
*/
function searchSwitchCloser( str , i , closer , closerStreak = 1 , noSpaceBefore = false , inline = false , end = str.length ) {
	var streak = 0 ;

	for ( ; i < end ; i ++ ) {
		if ( inline && str[ i ] === '\n' ) { break ; }

		if ( str[ i ] === closer && ( ! noSpaceBefore || ! WHITE_SPACES.has( str[ i - 1 ] ) ) ) {
			streak ++ ;
			if ( streak === closerStreak && str[ i + 1 ] !== closer ) { return i ; }
		}
		else {
			streak = 0 ;
		}
	}

	return -1 ;
}



/*
	Same that searchSwitchCloser() but for things like block switcher like '```'.
	So it search for new lines, and search the switcher at the begining of that line.
	It returns an array with the block end index before and after the ending markup, or null if nothing was found.

	closerMinStreak: number of times the closer char should repeat
	end: the position in the string where to stop scanning
*/
function searchBlockSwitchCloser( str , i , closer , closerMinStreak = 1 , end = str.length ) {
	var streak = 0 ;

	while ( i < end ) {
		// Search next line
		while ( str[ i ] !== '\n' && i < end ) { i ++ ; }

		i ++ ;

		if ( str[ i ] === closer ) {
			let streak = countStreak( str , i , closer ) ;
			if ( streak >= closerMinStreak ) {
				end = searchEndOfEmptyLine( str , i + streak ) ;
				if ( end >= 0 ) {
					return [ i , end ] ;
				}
			}
		}
	}

	return null ;
}



// Count successive char
function countStreak( str , i , streaker ) {
	var length = str.length ,
		count = 0 ;

	while ( i < length && str[ i ] === streaker ) {
		i ++ ;
		count ++ ;
	}

	return count ;
}



function stack( runtime , parent = runtime.parts[ runtime.parts.length - 1 ] ) {
	runtime.stack.push( {
		parts: runtime.parts ,
		parent: runtime.parent
	} ) ;

	runtime.parent = parent ;
	runtime.parts = parent.children = parent.children || [] ;
}



function unstack( runtime ) {
	if ( ! runtime.stack.length ) { return ; }
	var old = runtime.stack.pop() ;
	runtime.parts = old.parts ;
	runtime.parent = old.parent ;
}



function unstackToIndent( runtime , toIndent = 0 ) {
	while ( runtime.parent && toIndent <= ( runtime.parent.indent || 0 ) ) {
		let old = runtime.stack.pop() ;
		runtime.parts = old.parts ;
		runtime.parent = old.parent ;
	}
}

