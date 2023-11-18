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

	var ctx = {
		i: 0 ,
		iStartOfInlineChunk: 0 ,
		iEndOfBlock: str.length ,	// For nested things, the parent end here
		structuredText: new StructuredText() ,
		stack: [] ,
		parts: null ,
		parent: null
	} ;

	ctx.parts = ctx.structuredText.parts ;

	if ( typeof str !== 'string' ) {
		if ( str && typeof str === 'object' ) { str = str.toString() ; }
		else { throw new TypeError( "Argument #0 should be a string or an object with a .toString() method" ) ; }
	}

	parseBlocks( str , ctx ) ;

	// Call depthManagement() one last time, because some instanceOf may still be hanging...
	//ctx.depth = -1 ;
	//depthManagement( ctx ) ;

	return ctx.structuredText ;
} ;



function parseBlocks( str , ctx ) {
	while ( ctx.i < str.length ) {
		parseBlock( str , ctx ) ;
	}
}



function parseBlock( str , ctx ) {
	var { isEmptyLine , endOfEmptyLine , indentCharCount , indentSpaces , indentType } = detectIndent( str , ctx.i , ctx.parent?.indent ) ;

	if ( isEmptyLine ) {
		ctx.i = endOfEmptyLine + 1 ;
		return ;
	}

	if ( indentType === QUOTE_INDENT ) {
		ctx.parts.push( { type: 'quote' , indent: indentSpaces } ) ;
		stack( ctx ) ;
	}
	else if ( indentType <= 0 ) {
		unstackToIndent( ctx , indentSpaces ) ;
	}

	ctx.i += indentCharCount ;
	var blockType = detectBlockType( str , ctx.i ) ;
	console.error( "=== parseBlock() ===" , { blockType , isEmptyLine , endOfEmptyLine , indentCharCount , indentSpaces , indentType } ) ;
	
	
	switch ( blockType ) {
		case BLOCK_PARAGRAPH :
			parseParagraph( str , ctx ) ;
			break ;
		case BLOCK_HEADER :
			parseHeader( str , ctx ) ;
			break ;
		case BLOCK_CITE :
			parseCite( str , ctx ) ;
			break ;
		case BLOCK_LIST_ITEM :
			parseListItem( str , ctx , indentSpaces ) ;
			break ;
		case BLOCK_ORDERED_LIST_ITEM :
			parseOrderedListItem( str , ctx , indentSpaces ) ;
			break ;
		case BLOCK_MEDIA :
			parseMedia( str , ctx ) ;
			break ;
		case BLOCK_FLOAT_LEFT_MEDIA :
			parseMedia( str , ctx , 'left' ) ;
			break ;
		case BLOCK_FLOAT_RIGHT_MEDIA :
			parseMedia( str , ctx , 'right' ) ;
			break ;
		case BLOCK_HORIZONTAL_RULE :
			parseHorizontalRule( str , ctx ) ;
			break ;
		case BLOCK_CLEAR_FLOAT :
			parseClearFloat( str , ctx ) ;
			break ;
		case BLOCK_CODE :
			parseCodeBlock( str , ctx ) ;
			break ;
		case BLOCK_TABLE_ROW :
			parseTableRow( str , ctx ) ;
			break ;
		case BLOCK_TABLE_ROW_SEPARATOR :
			parseTableRowSeparator( str , ctx ) ;
			break ;
		case BLOCK_TABLE_CAPTION :
			parseTableRow( str , ctx ) ;
			break ;
		case BLOCK_ANCHOR :
			parseAnchor( str , ctx ) ;
			break ;
		case BLOCK_CONTINUE :
			// This is a malformed part
			console.error( "Malformed part, assuming a paragraph" ) ;
			parseParagraph( str , ctx ) ;
			break ;
		default :
			throw new Error( "Bad block detection: " + blockType ) ;
	}
	
	if ( str[ ctx.i ] === '\n' ) {
		ctx.i ++ ;
	}
}



const UNQUOTE_INDENT = -3 ;
const UNLIST_INDENT = -2 ;
const DISCONTINUE_INDENT = -1 ;
const NO_INDENT = 0 ;
const CONTINUE_INDENT = 1 ;	// 2 spaces, continue the previous block
const LIST_INDENT = 2 ;		// 4 spaces (sub-list)
const QUOTE_INDENT = 3 ;	// 8 spaces (quote)

const DETECT_INDENT = {
	isEmptyLine: false ,
	endOfEmptyLine: -1 ,
	indentCharCount: 0 ,
	indentSpaces: 0 ,
	indentDelta: 0 ,
	indentType: NO_INDENT
} ;

function detectIndent( str , i , parentIndent ) {
	parentIndent = parentIndent || 0 ;

	DETECT_INDENT.isEmptyLine = false ;
	DETECT_INDENT.endOfEmptyLine = -1 ;
	DETECT_INDENT.indentCharCount = DETECT_INDENT.indentSpaces = DETECT_INDENT.indentDelta = 0 ;
	DETECT_INDENT.indentType = NO_INDENT ;

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

	DETECT_INDENT.indentDelta = DETECT_INDENT.indentSpaces - parentIndent ;

	if ( DETECT_INDENT.indentDelta >= 8 ) {
		DETECT_INDENT.indentType = QUOTE_INDENT ;
	}
	else if ( DETECT_INDENT.indentDelta >= 4 ) {
		DETECT_INDENT.indentType = LIST_INDENT ;
	}
	else if ( DETECT_INDENT.indentDelta >= 2 ) {
		DETECT_INDENT.indentType = CONTINUE_INDENT ;
	}
	else if ( DETECT_INDENT.indentDelta <= -8 ) {
		DETECT_INDENT.indentType = UNQUOTE_INDENT ;
	}
	else if ( DETECT_INDENT.indentDelta <= -4 ) {
		DETECT_INDENT.indentType = UNLIST_INDENT ;
	}
	else if ( DETECT_INDENT.indentDelta <= -2 ) {
		DETECT_INDENT.indentType = DISCONTINUE_INDENT ;
	}

	return DETECT_INDENT ;
}



const BLOCK_PARAGRAPH = 1 ;
const BLOCK_HEADER = 2 ;
const BLOCK_LIST_ITEM = 3 ;
const BLOCK_ORDERED_LIST_ITEM = 4 ;
const BLOCK_CITE = 5 ;
const BLOCK_MEDIA = 10 ;
const BLOCK_FLOAT_LEFT_MEDIA = 11 ;
const BLOCK_FLOAT_RIGHT_MEDIA = 12 ;
const BLOCK_HORIZONTAL_RULE = 20 ;
const BLOCK_CLEAR_FLOAT = 21 ;
const BLOCK_CODE = 30 ;
const BLOCK_TABLE_ROW = 40 ;
const BLOCK_TABLE_ROW_SEPARATOR = 41 ;
const BLOCK_TABLE_CAPTION = 42 ;
const BLOCK_ANCHOR = 50 ;

function detectBlockType( str , i ) {
	if ( str[ i ] === '#' ) {
		if ( str[ i + 1 ] === '(' ) { return BLOCK_ANCHOR ; }
		return BLOCK_HEADER ;
	}

	if ( str[ i ] === '!' && str[ i + 2 ] === '[' ) {
		if ( str[ i + 1 ] === '=' ) { return BLOCK_MEDIA ; }
		else if ( str[ i + 1 ] === '<' ) { return BLOCK_FLOAT_LEFT_MEDIA ; }
		else if ( str[ i + 1 ] === '>' ) { return BLOCK_FLOAT_RIGHT_MEDIA ; }
		return BLOCK_PARAGRAPH ;
	}

	if ( ( str[ i ] === '*' || str[ i ] === '-' ) && str[ i + 1 ] === ' ' ) {
		return BLOCK_LIST_ITEM ;
	}

	if ( str[ i ] === '-' && str[ i + 1 ] === '-' ) {
		if ( str[ i + 2 ] === '-' ) {
			return BLOCK_HORIZONTAL_RULE ;
		}
		if ( str[ i + 2 ] === ' ' && searchEndOfEmptyLine( str , i + 3 ) === -1 ) {
			return BLOCK_CITE ;
		}
	}

	if ( str[ i ] === '<' && str[ i + 1 ] === '-' && str[ i + 2 ] === '-' && str[ i + 3 ] === '-' ) {
		return BLOCK_CLEAR_FLOAT ;
	}

	if ( str[ i ] === '`' && str[ i + 1 ] === '`' && str[ i + 2 ] === '`' ) {
		return BLOCK_CODE ;
	}

	if ( str[ i ] === '|' ) {
		if ( str[ i + 1 ] === '[' ) { return BLOCK_TABLE_CAPTION ; }

		if (
			str[ i + 1 ] === '-'
			|| ( str[ i + 2 ] === '-' 
				&& ( str[ i + 1 ] === '<' || str[ i + 1 ] === '>' )
			)
		) {
			return BLOCK_TABLE_ROW_SEPARATOR ;
		}

		return BLOCK_TABLE_ROW ;
	}

	if ( str[ i ] >= '0' && str[ i ] <= '9' ) {
		let iAfterNumber = i + 1 ;
		while ( str[ iAfterNumber ] >= '0' && str[ iAfterNumber ] <= '9' ) { iAfterNumber ++ ; }

		if ( str[ iAfterNumber ] === '.' && ( str[ iAfterNumber + 1 ] === ' ' || str[ iAfterNumber + 1 ] === '\t' ) ) {
			return BLOCK_ORDERED_LIST_ITEM ;
		}
	}

	return BLOCK_PARAGRAPH ;
}



const DEFAULT_BLOCK_END_PARAMS = {
	acceptEmptyLine: false ,
	acceptBlockType: -1 ,
	acceptContinueIndent: true ,
	acceptIndent: false
} ;

/*
	Params:
		acceptEmptyLine: the block is not interrupted by empty line
		acceptBlockType: this block is accepted as a continuation
		acceptContinueIndent: continue if the block is indented 2 spaces (“continue indent”)
		acceptIndent: continue if the block is indented to the next level (4 or more)
*/
function detectBlockEnd( str , nextScanStart , parentIndent = 0 , params = DEFAULT_BLOCK_END_PARAMS ) {
	var detectedBlockType , isEmptyLine , endOfEmptyLine , indentCharCount , indentSpaces , indentType ,
		blockEnd = nextScanStart ;

	console.error( "=== detectBlockEnd() ===" , nextScanStart , parentIndent , params ) ;
	while ( nextScanStart < str.length ) {
		// First, move at the start of the next line...
		let endOfLine = searchEndOfLine( str , nextScanStart ) ;
		console.error( "-> endOfLine:" , endOfLine ) ;
		blockEnd = endOfLine ;
		nextScanStart = endOfLine + 1 ;

		if ( nextScanStart > str.length ) { break ; }

		( { isEmptyLine , endOfEmptyLine , indentCharCount , indentSpaces , indentType } = detectIndent( str , nextScanStart , parentIndent ) ) ;
		console.error( "-> detectIndent():" , { isEmptyLine , endOfEmptyLine , indentCharCount , indentSpaces , indentType } ) ;

		if ( isEmptyLine ) {
			if ( ! params.acceptEmptyLine ) { return blockEnd ; }
			nextScanStart = endOfEmptyLine + 1 ;
			continue ;
		}
		
		if ( indentType < 0 ) { return blockEnd ; }
		if ( indentType === CONTINUE_INDENT && params.acceptContinueIndent ) { continue ; }
		if ( indentType > 0 && params.acceptIndent ) { continue ; }

		detectedBlockType = detectBlockType( str , nextScanStart ) ;
		console.error( "-> detectBlockType():" , detectedBlockType ) ;
		if ( params.acceptBlockType !== detectedBlockType ) { return blockEnd ; }
	}
	
	return blockEnd ;
}



const PARAGRAPH_END_PARAMS = {
	acceptEmptyLine: false ,
	acceptBlockType: BLOCK_PARAGRAPH ,
	acceptContinueIndent: false ,
	acceptIndent: false
} ;

function parseParagraph( str , ctx ) {
	//console.error( "parseParagraph in:" , ctx.i , str.slice( ctx.i ) ) ;
	ctx.parts.push( { type: 'paragraph' } ) ;

	var blockEnd = detectBlockEnd( str , ctx.i , ctx.parent?.indent , PARAGRAPH_END_PARAMS ) ;
	console.error( "blockEnd:" , blockEnd ) ;
	parseInlineChildren( str , ctx , blockEnd ) ;

	//console.error( "children:" , children ) ;
	//console.error( "parseParagraph out:" , ctx.i , str.slice( ctx.i ) ) ;
}



const HEADER_END_PARAMS = {
	acceptEmptyLine: false ,
	//acceptBlockType: BLOCK_HEADER ,
	acceptContinueIndent: true ,
	acceptIndent: false
} ;

function parseHeader( str , ctx ) {
	var streak = countStreak( str , ctx.i , '#' ) ;
	//if ( str[ ctx.i + streak ] !== ' ' ) { return parseParagraph( str , ctx ) ; }

	ctx.i += streak ;
	if ( str[ ctx.i ] === ' ' ) { ctx.i ++ ; }
	ctx.parts.push( { type: 'header' , level: streak } ) ;

	var blockEnd = detectBlockEnd( str , ctx.i , ctx.parent?.indent , HEADER_END_PARAMS ) ;
	parseInlineChildren( str , ctx , blockEnd ) ;
}



const CITE_END_PARAMS = {
	acceptEmptyLine: false ,
	//acceptBlockType: BLOCK_CITE ,
	acceptContinueIndent: true ,
	acceptIndent: false
} ;

function parseCite( str , ctx ) {
	ctx.i += 3 ;
	ctx.parts.push( { type: 'cite' } ) ;

	var blockEnd = detectBlockEnd( str , ctx.i , ctx.parent?.indent , CITE_END_PARAMS ) ;
	parseInlineChildren( str , ctx , blockEnd ) ;
}



// Lists themselve are auto-aggregating, accepting empty-lines, item needs continue-indent
const LIST_ITEM_END_PARAMS = {
	acceptEmptyLine: false ,
	//acceptBlockType: BLOCK_LIST_ITEM ,
	acceptContinueIndent: true ,
	acceptIndent: false
} ;

function parseListItem( str , ctx , indent ) {
	ctx.i += 2 ;

	var lastPart = ctx.parts[ ctx.parts.length - 1 ] ;

	if ( ! lastPart || lastPart.type !== 'list' ) {
		ctx.parts.push( { type: 'list' , indent } ) ;
	}

	stack( ctx ) ;

	ctx.parts.push( { type: 'listItem' , indent } ) ;

	var blockEnd = detectBlockEnd( str , ctx.i , ctx.parent?.indent , LIST_ITEM_END_PARAMS ) ;
	parseInlineChildren( str , ctx , blockEnd ) ;
}



function parseOrderedListItem( str , ctx , indent ) {
	var endOfNumber = ctx.i ;
	while ( str[ endOfNumber ] >= '0' && str[ endOfNumber ] <= '9' ) { endOfNumber ++ ; }

	var order = parseInt( str.slice( ctx.i , endOfNumber ) , 10 ) ;
	ctx.i = endOfNumber + 2 ;

	var lastPart = ctx.parts[ ctx.parts.length - 1 ] ;

	if ( ! lastPart || lastPart.type !== 'orderedList' ) {
		ctx.parts.push( { type: 'orderedList' , indent } ) ;
	}

	stack( ctx ) ;

	ctx.parts.push( { type: 'orderedListItem' , indent , order } ) ;

	var blockEnd = detectBlockEnd( str , ctx.i , ctx.parent?.indent , LIST_ITEM_END_PARAMS ) ;
	parseInlineChildren( str , ctx , blockEnd ) ;
}



const MEDIA_DATA_MARK = { text: true , href: true , style: false , extra: true } ;

function parseMedia( str , ctx , float = null ) {
	var end = searchCloser( str , ctx.i + 3 , '[' , ']' ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( ctx.i + 3 , end ) ;

	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
	//var data = parseDataMark( str , ctx , MEDIA_DATA_MARK , blockEnd ) ;
	var data = parseDataMark( str , ctx , MEDIA_DATA_MARK ) ;
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
	ctx.parts.push( params ) ;
	ctx.i ++ ;
}



function parseHorizontalRule( str , ctx ) {
	var params = { type: 'horizontalRule' } ,
		streak = countStreak( str , ctx.i , '-' ) ;

	if (
		str[ ctx.i + streak ] === '<'
		&& str[ ctx.i + streak + 1 ] === '>'
		&& str[ ctx.i + streak + 2 ] === '-'
		&& str[ ctx.i + streak + 3 ] === '-'
		&& str[ ctx.i + streak + 4 ] === '-'
	) {
		params.clearFloat = true ;
	}

	ctx.parts.push( params ) ;
	ctx.i = searchEndOfLine( str , ctx.i ) + 1 ;
}



function parseClearFloat( str , ctx ) {
	var streak = countStreak( str , ctx.i + 1 , '-' ) ;

	if ( str[ ctx.i + 1 + streak ] === '>' ) {
		ctx.parts.push( { type: 'clearFloat' } ) ;
		ctx.i = searchEndOfLine( str , ctx.i ) + 1 ;
	}
	else {
		parseParagraph( str , ctx ) ;
	}
}



function parseCodeBlock( str , ctx ) {
	var streak = countStreak( str , ctx.i , '`' ) ,
		endOfLine = searchEndOfLine( str , ctx.i + streak ) ,
		lang = str.slice( ctx.i + streak , endOfLine ).trim() || null ,
		contentStart = endOfLine + 1 ;

	var ends = searchBlockSwitchCloser( str , contentStart , '`' , 3 ) ;

	if ( ! ends ) {
		return parseParagraph( str , ctx ) ;
	}

	var [ contentEnd , blockEnd ] = ends ;

	var params = { type: 'codeBlock' } ;
	if ( lang ) { params.lang = lang ; }
	params.text = str.slice( contentStart , contentEnd - 1 ) ;	// We strip the last newline
	ctx.parts.push( params ) ;
	ctx.i = blockEnd ;
}



function parseAnchor( str , ctx ) {
	//console.log( "parseAnchor()" ) ;
	var end = searchCloser( str , ctx.i + 2 , '(' , ')' , true ) ;
	if ( end < 0 ) { return parseParagraph( str , ctx ) ; }

	ctx.parts.push( {
		type: 'anchor' ,
		href: str.slice( ctx.i + 2 , end )
	} ) ;
	
	ctx.i = end + 1 ;
}



function parseTableRow( str , ctx ) {
	//console.log( "parseTableRow()" ) ;
	var endOfLine = searchEndOfLine( str , ctx.i + 1 ) ;
	if ( endOfLine - ctx.i < 3 && ( str[ endOfLine - 1 ] !== '|' || str[ endOfLine - 1 ] === '\\' ) ) {
		return parseParagraph( str , ctx ) ;
	}

	var lastPart = ctx.parts[ ctx.parts.length - 1 ] ;

	if ( ! lastPart || lastPart.type !== 'table' ) {
		ctx.parts.push( { type: 'table' } ) ;
	}

	stack( ctx ) ;
	var lastRow = ctx.parts[ ctx.parts.length - 1 ] || null ;
	ctx.parts.push( { type: 'tableRow' } ) ;
	stack( ctx ) ;

	var rowStart = ctx.i ,
		cellStart = ctx.i + 1 ;

	for ( let i = cellStart ; i < endOfLine ; i ++ ) {
		if ( str[ i ] === '\\' ) {
			// Skip the next char
			i ++ ;
			continue ;
		}

		if ( str[ i ] === '|' && str[ i - 1 ] === ' ' ) {
			ctx.parts.push( {
				type: 'tableCell' ,
				// sx = Start X, the x position of start of the cell in the source text
				// ex = End X, the x position of the end of the cell in the source text
				// It's the '|' bar position and it helps for column span calculation
				sx: cellStart - rowStart - 1 ,
				ex: i - rowStart
			} ) ;
			
			ctx.i = cellStart + 1 ;
			parseInlineChildren( str , ctx , i - 2 ) ;
			cellStart = i + 1 ;
		}
	}

	ctx.i = endOfLine ;
}



function parseTableRowSeparator( str , ctx ) {
}



function parseTableCaption( str , ctx ) {
}



function parseInlineChildren( str , ctx , blockEnd ) {
	stack( ctx ) ;
	parseInline( str , ctx , blockEnd ) ;
	unstack( ctx ) ;
}



// Try to parse non-block content
function parseInline( str , ctx , blockEnd ) {
	//console.log( "parseInline() -- remaining:" , ctx.i , str.slice( ctx.i ) ) ;
	var isSpace ,
		lastWasSpace = WHITE_SPACES.has( str[ ctx.i - 1 ] ) ;
	
	blockEnd = blockEnd ?? searchEndOfLine( str , ctx.i ) ;

	ctx.iStartOfInlineChunk = ctx.i ;

	for ( ; ctx.i < blockEnd ; ctx.i ++ ) {
		let char = str[ ctx.i ] ;

		//if ( lastWasSpace ) {}
		//console.error( "Checking: " , string.inspect( char ) ) ;

		isSpace = WHITE_SPACES.has( char ) ;

		if ( isSpace ) {
			addInlineTextChunk( str , ctx ) ;
			parseWhiteSpace( str , ctx ) ;
		}
		else if ( char === '\\' ) {
			addInlineTextChunk( str , ctx ) ;
			parseEscape( str , ctx ) ;
		}
		else if ( char === '*' && ! WHITE_SPACES.has( str[ ctx.i + 1 ] ) ) {
			addInlineTextChunk( str , ctx ) ;
			parseEmphasis( str , ctx , blockEnd ) ;
		}
		else if ( char === '_' && ! WHITE_SPACES.has( str[ ctx.i + 1 ] ) ) {
			addInlineTextChunk( str , ctx ) ;
			parseDecoration( str , ctx , blockEnd ) ;
		}
		else if ( char === '`' ) {
			addInlineTextChunk( str , ctx ) ;
			parseCode( str , ctx , blockEnd ) ;
		}
		else if ( char === '[' ) {
			addInlineTextChunk( str , ctx ) ;
			parseStyledText( str , ctx , blockEnd ) ;
		}
		else if ( char === '!' && str[ ctx.i + 1 ] === '[' && lastWasSpace ) {
			addInlineTextChunk( str , ctx ) ;
			parseImage( str , ctx , blockEnd ) ;
		}

		lastWasSpace = isSpace ;
	}
	
	addInlineTextChunk( str , ctx ) ;

	ctx.i = blockEnd ;

	if ( str[ ctx.i ] === '\n' ) {
		ctx.i ++ ;
	}
}



function addInlineTextChunk( str , ctx , forcedChunk = null ) {
	var chunk = forcedChunk ?? str.slice( ctx.iStartOfInlineChunk , ctx.i ) ;
	
	if ( chunk ) {
		let lastPart = ctx.parts[ ctx.parts.length - 1 ] ;

		if ( lastPart && lastPart.type === 'text' ) {
			lastPart.text += chunk ;
		}
		else {
			ctx.parts.push( {
				type: 'text' ,
				text: chunk
			} ) ;
		}
	}

	if ( ! forcedChunk ) {
		ctx.iStartOfInlineChunk = ctx.i ;
	}
}



const WHITE_SPACES = new Set( [ ' ' , '\t' , '\n' , '\r' ] ) ;



function parseWhiteSpace( str , ctx ) {
	var end = ctx.i + 1 ;
	while ( WHITE_SPACES.has( str[ end ] ) ) { end ++ ; }

	ctx.i = end - 1 ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;

	addInlineTextChunk( str , ctx , ' ' ) ;
}



function parseEscape( str , ctx ) {
	if ( ctx.i + 1 >= str.length ) {
		ctx.iStartOfInlineChunk = ctx.i + 1 ;
		return ;
	}

	let char = str[ ctx.i + 1 ] ;

	if ( str[ ctx.i + 1 ] === ' ' ) {
		if ( str[ ctx.i - 1 ] === '\n' ) {
			addInlineTextChunk( str , ctx , '\n' ) ;
		}
		else if ( searchEndOfEmptyLine( str , ctx.i + 2 ) !== -1 ) {
			// Since we are not at the begining of the line, it actually search for trailing white chars
			addInlineTextChunk( str , ctx , '\n' ) ;
		}
		else {
			addInlineTextChunk( str , ctx , ' ' ) ;
		}
	}
	else if ( str[ ctx.i + 1 ] === '\n' ) {
		addInlineTextChunk( str , ctx , '\n' ) ;
	}
	else {
		addInlineTextChunk( str , ctx , str[ ctx.i + 1 ] ) ;
	}

	ctx.i ++ ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
}



function parseEmphasis( str , ctx , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , ctx.i , '*' ) ;
	if ( streak > 3 ) { return ; }
	var end = searchSwitchCloser( str , ctx.i + streak , '*' , streak , true , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( ctx.i + streak , end + 1 - streak ) ;

	ctx.parts.push( { type: 'emphasis' , level: streak , text } ) ;
	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
}



function parseDecoration( str , ctx , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , ctx.i , '_' ) ;
	if ( streak > 2 ) { return ; }
	var end = searchSwitchCloser( str , ctx.i + streak , '_' , streak , true , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( ctx.i + streak , end + 1 - streak ) ;

	ctx.parts.push( { type: 'decoration' , underline: true , level: streak , text } ) ;
	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
}



function parseCode( str , ctx , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , ctx.i , '`' ) ;
	// Markdown supports inline code inside two pairs of backquote, to allow backquote in code, hence streak can be 2.
	if ( streak > 2 ) { return ; }
	var end = searchSwitchCloser( str , ctx.i + streak , '`' , streak , false , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var sliceStart = ctx.i + streak ,
		sliceEnd = end + 1 - streak ;

	if ( str[ sliceStart ] === ' ' && str[ sliceStart + 1 ] === '`' ) { sliceStart ++ ; }
	if ( str[ sliceEnd - 1 ] === ' ' && str[ sliceEnd - 2 ] === '`' ) { sliceEnd -- ; }

	var text = str.slice( sliceStart , sliceEnd ) ;

	ctx.parts.push( { type: 'code' , text } ) ;
	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
}



const STYLE_DATA_MARK = { text: false , href: true , style: true , extra: true } ;

function parseStyledText( str , ctx , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var end = searchCloser( str , ctx.i + 1 , '[' , ']' , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( ctx.i + 1 , end ) ;

	ctx.i = end ;
	var data = parseDataMark( str , ctx , STYLE_DATA_MARK , blockEnd ) ;
	if ( ! data ) { return ; }
	
	var params = { type: '' , text } ;
	if ( data.href?.length ) { params.href = data.href[ 0 ] ; }
	if ( data.style?.length ) { params.style = data.style[ 0 ] ; }
	if ( data.extra?.length ) { params.title = data.extra[ 0 ] ; }

	if ( params.href ) {
		params.type = 'link' ;
		ctx.parts.push( params ) ;
	}
	else if ( params.style || params.title ) {
		params.type = 'styledText' ;
		ctx.parts.push( params ) ;
	}
}



const IMAGE_DATA_MARK = { text: true , href: true , style: false , extra: true } ;

function parseImage( str , ctx , blockEnd ) {
	//console.error( "parseStyledText()" ) ;
	var end = searchCloser( str , ctx.i + 2 , '[' , ']' , false , blockEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( ctx.i + 2 , end ) ;

	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
	var data = parseDataMark( str , ctx , IMAGE_DATA_MARK , blockEnd ) ;
	if ( ! data ) { return ; }
	
	var params = { type: '' , altText: text } ;
	if ( data.href?.length ) { params.href = data.href[ 0 ] ; }
	if ( data.extra?.length ) { params.title = data.extra[ 0 ] ; }
	
	if ( params.href ) {
		params.type = 'image' ;
		params.altText = text ;
		ctx.parts.push( params ) ;
	}
	else {
		params.type = 'pictogram' ;
		params.code = text ;
		let emojiChar = emoji.get( text ) ;
		if ( emojiChar ) { params.emoji = emojiChar ; }

		if ( data.text?.length ) { params.altText = data.text[ 0 ] ; }
		else if ( emojiChar ) { params.altText = emoji.getCanonicalName( emojiChar ) ; }

		ctx.parts.push( params ) ;
	}
}



function parseDataMark( str , ctx , allow , blockEnd ) {
	var end ,
		data = {} ;

	for ( ;; ) {
		if ( str[ ctx.i + 1 ] === '[' && allow.text ) {
			end = searchCloser( str , ctx.i + 2 , '[' , ']' , false , blockEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.text ) { data.text = [] ; }
			data.text.push( str.slice( ctx.i + 2 , end ) ) ;
			ctx.i = end ;
			ctx.iStartOfInlineChunk = ctx.i + 1 ;
		}
		else if ( str[ ctx.i + 1 ] === '(' && allow.href ) {
			end = searchCloser( str , ctx.i + 2 , '(' , ')' , true , blockEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.href ) { data.href = [] ; }
			data.href.push( str.slice( ctx.i + 2 , end ) ) ;
			ctx.i = end ;
			ctx.iStartOfInlineChunk = ctx.i + 1 ;
		}
		else if ( str[ ctx.i + 1 ] === '<' && allow.style ) {
			end = searchCloser( str , ctx.i + 2 , '<' , '>' , true , blockEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.style ) { data.style = [] ; }
			data.style.push( str.slice( ctx.i + 2 , end ) ) ;
			ctx.i = end ;
			ctx.iStartOfInlineChunk = ctx.i + 1 ;
		}
		else if ( str[ ctx.i + 1 ] === '{' && allow.extra ) {
			end = searchCloser( str , ctx.i + 2 , '{' , '}' , false , blockEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.extra ) { data.extra = [] ; }
			data.extra.push( str.slice( ctx.i + 2 , end ) ) ;
			ctx.i = end ;
			ctx.iStartOfInlineChunk = ctx.i + 1 ;
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



function stack( ctx , parent = ctx.parts[ ctx.parts.length - 1 ] ) {
	ctx.stack.push( {
		parts: ctx.parts ,
		parent: ctx.parent ,
		iEndOfBlock: ctx.iEndOfBlock
	} ) ;

	ctx.parent = parent ;
	ctx.parts = parent.children = parent.children || [] ;
}



function unstack( ctx ) {
	if ( ! ctx.stack.length ) { return ; }
	var old = ctx.stack.pop() ;
	ctx.parts = old.parts ;
	ctx.parent = old.parent ;
	ctx.iEndOfBlock = old.iEndOfBlock ;
}



function unstackToIndent( ctx , toIndent = 0 ) {
	var parentIndent = ctx.parent?.indent || 0 ,
		parentType = ctx.parent?.type ;

	while ( ctx.parent && ( toIndent < parentIndent || ( toIndent === parentIndent && parentType !== 'quote' ) ) ) {
		let old = ctx.stack.pop() ;
		ctx.parts = old.parts ;
		ctx.parent = old.parent ;
		ctx.iEndOfBlock = old.iEndOfBlock ;
		parentIndent = ctx.parent?.indent || 0 ;
		parentType = ctx.parent?.type ;
	}
}

