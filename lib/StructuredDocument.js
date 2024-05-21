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



const documentParts = require( './documentParts.js' ) ;
const Style = require( './Style.js' ) ;
const Theme = require( './Theme.js' ) ;

const inPlaceFilter = require( 'array-kit/lib/inPlaceFilter.js' ) ;



function StructuredDocument() {
	this.title = 'Document' ;
	this.metadata = null ;
	this.theme = null ;
	this.parts = [] ;
}

module.exports = StructuredDocument ;



StructuredDocument.prototype.render = function( renderer ) {
	var meta = {
		title: this.title
	} ;

	var output = this.renderParts( renderer , this.parts , [] , [ {} ] ) ;

	if ( renderer.document ) {
		output = renderer.document( meta , output ) ;
	}

	return output ;
} ;



const FRAGMENT = {} ;

FRAGMENT.string = {
	new: () => '' ,
	append: ( stack_ , part ) => stack_ + ( part || '' ) ,
	concat: ( stack_ , parts ) => stack_ + ( parts || '' )
} ;

FRAGMENT.flatStructure = {
	new: () => [] ,
	append: ( stack_ , part ) => {
		if ( part ) {
			if ( Array.isArray( part ) ) { stack_.push( ... part ) ; }
			else { stack_.push( part ) ; }
		}
		return stack_ ;
	} ,
	concat: ( stack_ , parts ) => {
		if ( parts && parts.length ) { stack_.push( ... parts ) ; }
		return stack_ ;
	}
} ;

FRAGMENT.structure = {
	new: () => [] ,
	append: ( stack_ , part ) => {
		if ( part ) { stack_.push( part ) ; }
		return stack_ ;
	} ,
	concat: ( stack_ , parts ) => {
		if ( parts && parts.length ) { stack_.push( ... parts ) ; }
		return stack_ ;
	}
} ;

StructuredDocument.prototype.renderParts = function( renderer , parts , partStack , userlandStack ) {
	var fragment = FRAGMENT[ renderer.type || 'string' ] ,
		output = fragment.new() ,
		index = 0 ;

	for ( let part of parts ) {
		let preFn = 'pre_' + part.type ;
		let postFn = part.type ;
		let partsOutput = fragment.new() ;

		if ( renderer[ preFn ] ) {
			renderer[ preFn ]( part , partStack , userlandStack , index , parts.length ) ;
		}

		if ( part.parts ) {
			if ( renderer.group?.[ part.type ] ) {
				// Some renderer have to group child parts an apply things to each group,
				// E.g. HTML groups 'tableHeader' to produce <thead> and 'tableRow' to produce <tbody>
				let groupList = this.groupByType( part.parts , renderer.group[ part.type ] ) ;
				//console.error( "groupList:" , groupList ) ;

				for ( let group of groupList ) {
					if ( renderer.group[ part.type ][ group.type ] ) {
						partStack.push( part ) ;
						userlandStack.push( {} ) ;

						let groupOutput = this.renderParts( renderer , group.parts , partStack , userlandStack ) ;

						partStack.pop() ;
						userlandStack.pop() ;

						partsOutput = fragment.concat(
							partsOutput ,
							renderer.group[ part.type ][ group.type ]( part , groupOutput , partStack , userlandStack )
						) ;
					}
				}
			}
			else {
				partStack.push( part ) ;
				userlandStack.push( {} ) ;

				partsOutput = fragment.concat(
					partsOutput ,
					this.renderParts( renderer , part.parts , partStack , userlandStack )
				) ;

				partStack.pop() ;
				userlandStack.pop() ;
			}
		}

		if ( renderer[ postFn ] ) {
			output = fragment.append(
				output ,
				renderer[ postFn ]( part , partsOutput , partStack , userlandStack , index , parts.length )
			) ;
		}

		index ++ ;
	}

	return output ;
} ;



StructuredDocument.prototype.groupByType = function( parts , rendererGroup ) {
	var group , groupMap = {} , groupList = [] ;

	for ( let part of parts ) {
		group = groupMap[ part.type ] ;
		if ( ! group ) {
			group = groupMap[ part.type ] = {
				type: part.type ,
				parts: [] ,
				order: + rendererGroup[ part.type ]?.order || 0
			} ;
			groupList.push( group ) ;
		}

		group.parts.push( part ) ;
	}

	groupList.sort( ( a , b ) => a.order - b.order ) ;

	return groupList ;
} ;



StructuredDocument.prototype.autoTitle = function() {
	var header , str ;

	for ( let part of this.parts ) {
		if ( part.type === 'header' ) { header = part ; break ; }
	}

	if ( ! header ) { return ; }

	str = this.getText( header.parts ) ;
	if ( str ) { this.title = str ; }
} ;



StructuredDocument.prototype.getText = function( parts = this.parts ) {
	var str = '' ;

	for ( let part of parts ) {
		if ( part.text ) { str += part.text ; }
		else if ( part.parts?.length ) { str += this.getText( part.parts ) ; }
	}

	return str ;
} ;



// Parser

StructuredDocument.parse = function( str , options ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	if ( typeof str !== 'string' ) {
		if ( str && typeof str === 'object' ) { str = str.toString() ; }
		else { throw new TypeError( "Argument #0 should be a string or an object with a .toString() method" ) ; }
	}

	var ctx = {
		i: 0 ,
		iStartOfInlineChunk: 0 ,
		forceInlineChunkSpace: false ,
		iEndOfBlock: str.length ,	// For nested things, the parent end here
		lastLineWasEmpty: false ,
		lastBlock: null ,
		rowSpanTables: new Set() ,	// Set of table that needs post-processing to apply row span
		structuredDocument: new StructuredDocument() ,
		stack: [] ,
		parts: null ,
		parent: null ,
		rawMetadata: null
	} ;

	ctx.parts = ctx.structuredDocument.parts ;

	parseBlocks( str , ctx ) ;

	for ( let table of ctx.rowSpanTables ) { postProcessTableRowSpan( table ) ; }
	ctx.structuredDocument.autoTitle() ;

	if ( ctx.rawMetadata ) {
		let metadataParser = options.metadataParser || JSON.parse ;
		for ( let type in ctx.rawMetadata ) {
			try {
				let parsed = metadataParser( ctx.rawMetadata[ type ] ) ;
				if ( type === 'metadata' ) {
					ctx.structuredDocument.metadata = parsed ;
				}
				else if ( type === 'theme' && parsed && typeof parsed === 'object' ) {
					ctx.structuredDocument.theme = parsed ;
				}
			}
			catch ( error ) {}
		}
	}

	// Call depthManagement() one last time, because some instanceOf may still be hanging...
	//ctx.depth = -1 ;
	//depthManagement( ctx ) ;

	return ctx.structuredDocument ;
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
		ctx.lastLineWasEmpty = true ;
		ctx.lastBlock = null ;
		return ;
	}

	if ( indentType === QUOTE_INDENT ) {
		ctx.parts.push( new documentParts.Quote( indentSpaces ) ) ;
		stack( ctx ) ;
	}
	else if ( indentType <= 0 ) {
		unstackToIndent( ctx , indentSpaces ) ;
	}

	ctx.i += indentCharCount ;
	var blockType = detectBlockType( str , ctx.i ) ;
	//console.error( "=== parseBlock() ===" , { blockType , isEmptyLine , endOfEmptyLine , indentCharCount , indentSpaces , indentType } ) ;


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
		case BLOCK_TABLE_CAPTION :
			parseTableCaption( str , ctx ) ;
			break ;
		case BLOCK_TABLE_ROW :
			parseTableRow( str , ctx ) ;
			break ;
		case BLOCK_TABLE_ROW_SEPARATOR :
			parseTableRowSeparator( str , ctx ) ;
			break ;
		case BLOCK_TABLE_ROW_THICK_SEPARATOR :
			parseTableRowSeparator( str , ctx , true ) ;
			break ;
		case BLOCK_ANCHOR :
			parseAnchor( str , ctx ) ;
			break ;
		case BLOCK_METADATA :
			parseMetadata( str , ctx ) ;
			break ;
		default :
			throw new Error( "Bad block detection: " + blockType ) ;
	}

	ctx.lastLineWasEmpty = false ;
	ctx.lastBlock = blockType ;
	if ( str[ ctx.i ] === '\n' ) { ctx.i ++ ; }
}



const UNQUOTE_INDENT = - 3 ;
const UNLIST_INDENT = - 2 ;
const DISCONTINUE_INDENT = - 1 ;
const NO_INDENT = 0 ;
const CONTINUE_INDENT = 1 ;	// 2 spaces, continue the previous block
const LIST_INDENT = 2 ;		// 4 spaces (sub-list)
const QUOTE_INDENT = 3 ;	// 8 spaces (quote)

const DETECT_INDENT = {
	isEmptyLine: false ,
	endOfEmptyLine: - 1 ,
	indentCharCount: 0 ,
	indentSpaces: 0 ,
	indentDelta: 0 ,
	indentType: NO_INDENT
} ;

function detectIndent( str , i , parentIndent ) {
	parentIndent = parentIndent || 0 ;

	DETECT_INDENT.isEmptyLine = false ;
	DETECT_INDENT.endOfEmptyLine = - 1 ;
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
	else if ( DETECT_INDENT.indentDelta <= - 8 ) {
		DETECT_INDENT.indentType = UNQUOTE_INDENT ;
	}
	else if ( DETECT_INDENT.indentDelta <= - 4 ) {
		DETECT_INDENT.indentType = UNLIST_INDENT ;
	}
	else if ( DETECT_INDENT.indentDelta <= - 2 ) {
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
const BLOCK_TABLE_ROW_THICK_SEPARATOR = 42 ;
const BLOCK_TABLE_CAPTION = 43 ;
const BLOCK_ANCHOR = 50 ;
const BLOCK_METADATA = 60 ;

function detectBlockType( str , i ) {
	if ( str[ i ] === '\\' ) {
		return BLOCK_PARAGRAPH ;
	}

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
			if ( str[ i + 3 ] === '[' ) {
				return BLOCK_METADATA ;
			}

			return BLOCK_HORIZONTAL_RULE ;

		}
		if ( str[ i + 2 ] === ' ' && searchEndOfEmptyLine( str , i + 3 ) === - 1 ) {
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
			|| ( ( str[ i + 1 ] === '<' || str[ i + 1 ] === '>' ) && str[ i + 2 ] === '-' )
		) {
			return BLOCK_TABLE_ROW_SEPARATOR ;
		}

		if (
			str[ i + 1 ] === '='
			|| ( ( str[ i + 1 ] === '<' || str[ i + 1 ] === '>' ) && str[ i + 2 ] === '=' )
		) {
			return BLOCK_TABLE_ROW_THICK_SEPARATOR ;
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
	acceptBlockType: - 1 ,
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
	var detectedBlockType , isEmptyLine , endOfEmptyLine , indentType ,
		blockEnd = nextScanStart ;

	//console.error( "=== detectBlockEnd() ===" , nextScanStart , parentIndent , params ) ;
	while ( nextScanStart < str.length ) {
		// First, move at the start of the next line...
		let endOfLine = searchEndOfLine( str , nextScanStart ) ;
		//console.error( "-> endOfLine:" , endOfLine ) ;
		blockEnd = endOfLine ;
		nextScanStart = endOfLine + 1 ;

		if ( nextScanStart > str.length ) { break ; }

		( { isEmptyLine , endOfEmptyLine , indentType } = detectIndent( str , nextScanStart , parentIndent ) ) ;
		//console.error( "-> detectIndent():" , { isEmptyLine , endOfEmptyLine , indentCharCount , indentSpaces , indentType } ) ;

		if ( isEmptyLine ) {
			if ( ! params.acceptEmptyLine ) { return blockEnd ; }
			nextScanStart = endOfEmptyLine + 1 ;
			continue ;
		}

		if ( indentType < 0 ) { return blockEnd ; }
		if ( indentType === CONTINUE_INDENT && params.acceptContinueIndent ) { continue ; }
		if ( indentType > 0 && params.acceptIndent ) { continue ; }

		detectedBlockType = detectBlockType( str , nextScanStart ) ;
		//console.error( "-> detectBlockType():" , detectedBlockType ) ;
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
	ctx.parts.push( new documentParts.Paragraph() ) ;

	var blockEnd = detectBlockEnd( str , ctx.i , ctx.parent?.indent , PARAGRAPH_END_PARAMS ) ;
	//console.error( "blockEnd:" , blockEnd ) ;
	parseInlineChildren( str , ctx , blockEnd ) ;

	//console.error( "parts:" , parts ) ;
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
	ctx.parts.push( new documentParts.Header( streak ) ) ;

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
	ctx.parts.push( new documentParts.Cite() ) ;

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
		ctx.parts.push( new documentParts.List( indent ) ) ;
	}

	stack( ctx ) ;

	ctx.parts.push( new documentParts.ListItem( indent ) ) ;

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
		lastPart = new documentParts.OrderedList( indent ) ;
		ctx.parts.push( lastPart ) ;
	}

	stack( ctx ) ;

	ctx.parts.push( new documentParts.OrderedListItem( indent , order , lastPart.autoIndex ++ ) ) ;

	var blockEnd = detectBlockEnd( str , ctx.i , ctx.parent?.indent , LIST_ITEM_END_PARAMS ) ;
	parseInlineChildren( str , ctx , blockEnd ) ;
}



const MEDIA_DATA_MARK = {
	text: true , href: true , style: false , extra: false
} ;

function parseMedia( str , ctx , float = null ) {
	var end = searchCloser( str , ctx.i + 3 , '[' , ']' ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( ctx.i + 3 , end ) ;

	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
	var data = parseDataMark( str , ctx , MEDIA_DATA_MARK ) ;
	if ( ! data ) { return ; }

	if ( ! data.href?.[ 0 ] ) { return ; }

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

	if ( data.text?.length ) {
		params.caption = data.text[ 0 ] ;
		if ( data.text[ 1 ] ) { params.title = data.text[ 1 ] ; }
	}

	//if ( data.extra?.length ) { params.title = data.extra[ 0 ] ; }

	ctx.parts.push( params ) ;
	ctx.i ++ ;
}



function parseHorizontalRule( str , ctx ) {
	var clearFloat = false ,
		streak = countStreak( str , ctx.i , '-' ) ;

	if (
		str[ ctx.i + streak ] === '<'
		&& str[ ctx.i + streak + 1 ] === '>'
		&& str[ ctx.i + streak + 2 ] === '-'
		&& str[ ctx.i + streak + 3 ] === '-'
		&& str[ ctx.i + streak + 4 ] === '-'
	) {
		clearFloat = true ;
	}

	ctx.parts.push( new documentParts.HorizontalRule( clearFloat ) ) ;
	ctx.i = searchEndOfLine( str , ctx.i ) + 1 ;
}



function parseClearFloat( str , ctx ) {
	var streak = countStreak( str , ctx.i + 1 , '-' ) ;

	if ( str[ ctx.i + 1 + streak ] === '>' ) {
		ctx.parts.push( new documentParts.ClearFloat() ) ;
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

	var [ contentEnd , blockEnd ] = ends ,
		text = str.slice( contentStart , contentEnd - 1 ) ;		// We strip the last newline

	ctx.parts.push( new documentParts.CodeBlock( text , lang ) ) ;
	ctx.i = blockEnd ;
}



function parseMetadata( str , ctx ) {
	var endOfLine = searchEndOfLine( str , ctx.i + 4 ) ,
		nextBracket = searchNext( str , ctx.i + 4 , endOfLine , '[' ) ;

	if ( nextBracket < 0 ) { return parseParagraph( str , ctx ) ; }

	var type = str.slice( ctx.i + 4 , nextBracket ).trim() || 'metadata' ,
		contentStart = endOfLine + 1 ,
		ends = searchFixedBlockSwitchCloser( str , contentStart , ']]---' ) ;

	if ( ! ends ) { return parseParagraph( str , ctx ) ; }

	var [ contentEnd , blockEnd ] = ends ;

	if ( ! ctx.rawMetadata ) { ctx.rawMetadata = {} ; }
	if ( ! ctx.rawMetadata[ type ] ) { ctx.rawMetadata[ type ] = '' ; }
	ctx.rawMetadata[ type ] += str.slice( contentStart , contentEnd ) ;		// We DON'T strip the last newline
	ctx.i = blockEnd ;
}



function parseAnchor( str , ctx ) {
	//console.log( "parseAnchor()" ) ;
	var end = searchCloser( str , ctx.i + 2 , '(' , ')' , true ) ;
	if ( end < 0 ) { return parseParagraph( str , ctx ) ; }

	ctx.parts.push( new documentParts.Anchor( str.slice( ctx.i + 2 , end ) ) ) ;

	ctx.i = end + 1 ;
}



function parseTableCaption( str , ctx ) {
	//console.log( "parseTableCaption()" ) ;
	var lastCharOfLine = searchLastCharOfLine( str , ctx.i + 1 ) ;

	var end = searchCloser( str , ctx.i + 2 , '[' , ']' , true , lastCharOfLine ) ;

	// Check that the syntax is correct: |[ must be followed by a space and ]| must be preceded by a space
	if ( str[ ctx.i + 2 ] !== ' ' || str[ end - 1 ] !== ' ' || str[ end + 1 ] !== '|' ) {
		return parseParagraph( str , ctx ) ;
	}

	var table = ctx.parts[ ctx.parts.length - 1 ] ;

	if ( ! table || table.type !== 'table' || ctx.lastLineWasEmpty ) {
		table = new documentParts.Table() ;
		ctx.parts.push( table ) ;
	}

	ctx.i += 3 ;
	stack( ctx ) ;

	var lastRow = ctx.parts[ ctx.parts.length - 1 ] || null ,
		tableCaption = lastRow ;

	if ( ! lastRow || lastRow.type !== 'tableCaption' ) {
		tableCaption = new documentParts.TableCaption() ;
		ctx.parts.push( tableCaption ) ;
	}

	parseInlineChildren( str , ctx , end - 1 , true ) ;

	if ( str[ end + 2 ] === '<' ) {
		ctx.i = end + 1 ;
		let data = parseDataMark( str , ctx , CELL_DATA_MARK , lastCharOfLine + 1 , false ) ;
		if ( data?.style?.[ 0 ] ) { tableCaption.style = data.style[ 0 ] ; }
	}

	ctx.i = lastCharOfLine + 1 ;
}



const CELL_DATA_MARK = {
	text: false , href: false , style: true , extra: false
} ;

function parseTableRow( str , ctx ) {
	//console.log( "parseTableRow()" ) ;
	var lastCharOfLine = searchLastCharOfLine( str , ctx.i + 1 ) ,
		table = ctx.parts[ ctx.parts.length - 1 ] ,
		tableRow ,
		mergeMode = false ;

	if ( ! table || table.type !== 'table' || ctx.lastLineWasEmpty ) {
		table = new documentParts.Table() ;
		ctx.parts.push( table ) ;
	}

	stack( ctx ) ;

	if ( table.multilineRowMode && ctx.lastBlock === BLOCK_TABLE_ROW ) {
		//console.error( "???" , ctx.lastBlock , BLOCK_TABLE_ROW ) ;
		let lastRow = ctx.parts[ ctx.parts.length - 1 ] || null ;
		tableRow = lastRow ;

		if ( ! lastRow || lastRow.type !== 'tableRow' ) {
			tableRow = new documentParts.TableRow() ;
			ctx.parts.push( tableRow ) ;
		}
		else {
			mergeMode = true ;
		}
	}
	else {
		tableRow = new documentParts.TableRow() ;
		ctx.parts.push( tableRow ) ;
	}

	stack( ctx ) ;

	if ( mergeMode ) { return parseTableMultilineRow( str , ctx , lastCharOfLine , table , tableRow ) ; }


	//var leftAlign , rightAlign , leftCenter , rightCenter , headColumn ;
	var columnSeparator , style ,
		nextBar , firstSpace , lastSpace ,
		firstBar = ctx.i ,
		currentBar = ctx.i ;

	while ( ( nextBar = searchNext( str , currentBar + 1 , lastCharOfLine + 1 , '|' ) ) !== - 1 ) {
		//leftAlign = rightAlign = leftCenter = rightCenter = headColumn = false ;
		columnSeparator = false ;
		style = null ;

		lastSpace = searchPrevious( str , nextBar - 1 , currentBar , ' ' ) ;

		if ( str[ nextBar + 1 ] === '|' ) { columnSeparator = true ; }

		if ( str[ currentBar + 1 ] === '<' ) {
			ctx.i = currentBar ;
			let data = parseDataMark( str , ctx , CELL_DATA_MARK , nextBar , false ) ;
			if ( data?.style?.[ 0 ] ) { style = data.style[ 0 ] ; }
			firstSpace = searchNext( str , ctx.i , nextBar , ' ' ) ;
		}
		else {
			firstSpace = searchNext( str , currentBar + 1 , nextBar , ' ' ) ;
		}

		let tableCell = new documentParts.TableCell() ;

		// The '|' bar position helps for column span calculation
		// sx = Start X, the x position of the left bar
		tableCell.sx = currentBar - firstBar ;
		// ex = End X, the x position of the right bar
		tableCell.ex = nextBar - firstBar ;

		if ( style ) { tableCell.style = style ; }
		if ( columnSeparator ) { tableCell.columnSeparator = true ; }

		ctx.parts.push( tableCell ) ;

		ctx.i = firstSpace + 1 ;
		parseInlineChildren( str , ctx , lastSpace , true ) ;

		currentBar = columnSeparator ? nextBar + 1 : nextBar ;
	}

	// Compute cells indexes, columnSpan, rowSpan, column template
	computeIndexColumnSpan( ctx , table , tableRow ) ;

	if ( str[ currentBar + 1 ] === '<' ) {
		ctx.i = currentBar ;
		let data = parseDataMark( str , ctx , CELL_DATA_MARK , lastCharOfLine + 1 , false ) ;
		if ( data?.style?.[ 0 ] ) { tableRow.style = data.style[ 0 ] ; }
	}

	ctx.i = lastCharOfLine + 1 ;
}



// Merge current row with the previous
// Should only be called by parseTableRow() which put in the correct scope
function parseTableMultilineRow( str , ctx , lastCharOfLine , table , tableRow ) {
	var tableCell , columnSeparator , nextBar , firstSpace , lastSpace ,
		//firstBar = ctx.i ,
		currentBar = ctx.i ,
		columnIndex = 0 ;

	while ( ( nextBar = searchNext( str , currentBar + 1 , lastCharOfLine + 1 , '|' ) ) !== - 1 ) {
		columnSeparator = false ;

		firstSpace = searchNext( str , currentBar + 1 , nextBar , ' ' ) ;
		lastSpace = searchPrevious( str , nextBar - 1 , currentBar , ' ' ) ;

		if ( str[ nextBar + 1 ] === '|' ) { columnSeparator = true ; }

		tableCell = tableRow.parts[ columnIndex ] ;

		if ( tableCell ) {
			ctx.i = firstSpace + 1 ;
			ctx.forceInlineChunkSpace = true ;
			parseInlineChildrenOfParent( str , ctx , tableCell , lastSpace , true ) ;
		}

		currentBar = columnSeparator ? nextBar + 1 : nextBar ;
		columnIndex ++ ;
	}

	ctx.i = lastCharOfLine + 1 ;
}



function parseTableRowSeparator( str , ctx , thick = false ) {
	//console.log( "parseTableRowSeparator()" ) ;
	var tableRow , columnIndex ,
		lastCharOfLine = searchLastCharOfLine( str , ctx.i + 1 ) ,
		table = ctx.parts[ ctx.parts.length - 1 ] ;

	if ( ! table || table.type !== 'table' || ctx.lastLineWasEmpty ) {
		table = new documentParts.Table() ;
		ctx.parts.push( table ) ;
	}

	// Fix previous table row as table head row
	if ( ! table.hasHeadSeparator ) { return parseTableHeadRowSeparator( str , ctx , thick , lastCharOfLine ) ; }


	// So this is a true row separator, not a head/body separator

	// If this is the first row separator, we have to merge all existing rows into one
	if ( ! table.hasRowSeparator ) {
		table.multilineRowMode = true ;

		for ( let index = 0 ; index < table.parts.length ; index ++ ) {
			let child = table.parts[ index ] ;

			if ( child.type === 'tableRow' ) {
				if ( ! tableRow ) {
					tableRow = child ;
				}
				else {
					// All subsequent tableRows, are merged into the first tableRow

					if ( child.parts ) {
						for ( columnIndex = 0 ; columnIndex < child.parts.length ; columnIndex ++ ) {
							let child2 = child.parts[ columnIndex ] ;
							if ( child2.type === 'tableCell' || child2.type === 'tableHeadCell' ) {
								if ( tableRow.parts[ columnIndex ] ) {
									// Merge the cells
									mergeInlineParts( tableRow.parts[ columnIndex ].parts , child2.parts ) ;
								}
								else {
									tableRow.parts[ columnIndex ] = child2 ;
								}
							}
						}
					}

					table.parts.splice( index , 1 ) ;
					index -- ;
				}
			}
		}
	}

	table.hasRowSeparator = true ;

	if ( ! tableRow ) {
		tableRow = searchLastChildOfType( table , 'tableRow' ) ;

		if ( ! tableRow ) {
			ctx.i = lastCharOfLine + 1 ;
			return ;
		}
	}

	if ( thick ) { tableRow.rowSeparator = true ; }


	// Store row span
	var columnSeparator , nextBar ,
		firstBar = ctx.i ,
		currentBar = ctx.i ,
		columns = table.columns ,
		separatorCellIndex = 0 ;

	while ( ( nextBar = searchNext( str , currentBar + 1 , lastCharOfLine + 1 , '|' ) ) !== - 1 ) {
		columnSeparator = false ;

		if ( str[ nextBar + 1 ] === '|' ) { columnSeparator = true ; }

		if ( str[ currentBar + 1 ] === '-' && str[ currentBar + 2 ] === ' ' && str[ nextBar - 1 ] === '-' && str[ nextBar - 2 ] === ' ' ) {
			// This is a rowSpan
			table.hasRowSpan = true ;
			ctx.rowSpanTables.add( table ) ;
			if ( ! tableRow.continueRowSpan ) { tableRow.continueRowSpan = [] ; }

			let sx = currentBar - firstBar ;
			let closestDelta = Infinity ;
			let closestColumnIndex = separatorCellIndex ;

			for ( columnIndex = separatorCellIndex ; columnIndex < columns.length ; columnIndex ++ ) {
				let column = columns[ columnIndex ] ;
				let delta = Math.abs( sx - column.sx ) ;
				if ( delta < closestDelta ) {
					closestDelta = delta ;
					closestColumnIndex = columnIndex ;
				}
			}

			tableRow.continueRowSpan.push( closestColumnIndex ) ;
		}

		currentBar = columnSeparator ? nextBar + 1 : nextBar ;
		separatorCellIndex ++ ;
	}

	ctx.i = lastCharOfLine + 1 ;
}



function parseTableHeadRowSeparator( str , ctx , thick , lastCharOfLine ) {
	var columnIndex , tableHeadRow ,
		table = ctx.parts[ ctx.parts.length - 1 ] ,
		columns = table.columns ;

	table.hasHeadSeparator = true ;
	var leftAlign , rightAlign , leftCenter , rightCenter , headColumn , columnSeparator , style ,
		nextBar , firstHbar , lastHbar , hbarStreak ,
		hbarChar = thick ? '=' : '-' ,
		firstBar = ctx.i ,
		currentBar = ctx.i ;

	columnIndex = 0 ;

	while ( ( nextBar = searchNext( str , currentBar + 1 , lastCharOfLine + 1 , '|' ) ) !== - 1 ) {
		leftAlign = rightAlign = leftCenter = rightCenter = headColumn = columnSeparator = false ;
		style = null ;

		firstHbar = searchNext( str , currentBar + 1 , nextBar , hbarChar ) ;
		lastHbar = searchPrevious( str , nextBar - 1 , currentBar , hbarChar ) ;

		if ( str[ nextBar + 1 ] === '|' ) { columnSeparator = true ; }

		if ( firstHbar !== - 1 ) {
			if ( firstHbar - currentBar >= 2 ) {
				for ( let i = currentBar + 1 ; i < firstHbar ; i ++ ) {
					if ( str[ i ] === '<' ) { leftAlign = true ; }
					else if ( str[ i ] === '>' ) { leftCenter = true ; }
				}
			}

			if ( nextBar - lastHbar >= 2 ) {
				for ( let i = lastHbar + 1 ; i < nextBar ; i ++ ) {
					if ( str[ i ] === '<' ) { rightCenter = true ; }
					else if ( str[ i ] === '>' ) { rightAlign = true ; }
					else if ( str[ i ] === ':' ) { headColumn = true ; }
				}
			}

			hbarStreak = countStreak( str , firstHbar , hbarChar ) ;
			if ( firstHbar + hbarStreak - 1 !== lastHbar ) {
				// Check for style mark
				if ( str[ firstHbar + hbarStreak ] === '<' ) {
					ctx.i = firstHbar + hbarStreak - 1 ;
					let data = parseDataMark( str , ctx , CELL_DATA_MARK , lastHbar , false ) ;
					if ( data?.style?.[ 0 ] ) { style = data.style[ 0 ] ; }
				}
			}
		}

		let columnTemplate = columns[ columnIndex ] ;
		if ( ! columnTemplate ) { columnTemplate = columns[ columnIndex ] = {} ; }

		// The '|' bar position helps for column span calculation
		// sx = Start X, the x position of the left bar
		columnTemplate.sx = currentBar - firstBar ;
		// ex = End X, the x position of the right bar
		columnTemplate.ex = nextBar - firstBar ;

		if ( headColumn ) { columnTemplate.headColumn = true ; }
		if ( style ) { columnTemplate.style = style ; }
		if ( columnSeparator ) { columnTemplate.columnSeparator = true ; }
		if ( leftAlign || rightAlign || leftCenter || rightCenter ) {
			columnTemplate.align =
				leftCenter && rightCenter ? 'center' :
				leftAlign && rightAlign ? 'justify' :
				leftAlign ? 'left' :
				rightAlign ? 'right' :
				'default' ;
		}

		currentBar = columnSeparator ? nextBar + 1 : nextBar ;
		columnIndex ++ ;
	}


	// Should come AFTER, because it needs column info
	// Fix previous table row as table head row: turn all existing tableRow into tableHeadRow

	for ( let index = 0 ; index < table.parts.length ; index ++ ) {
		let child = table.parts[ index ] ;

		if ( child.type === 'tableRow' ) {
			if ( ! tableHeadRow ) {
				// This is the first tableRow, turn it into a a tableHeadRow
				//child.type = 'tableHeadRow' ;
				table.parts[ index ] = child = child.toHead() ;

				if ( child.parts ) {
					for ( columnIndex = 0 ; columnIndex < child.parts.length ; columnIndex ++ ) {
						let child2 = child.parts[ columnIndex ] ;
						if ( child2.type === 'tableCell' ) {
							//child2.type = 'tableHeadCell' ;
							child.parts[ columnIndex ] = child2 = child2.toHead() ;
							child2.isColumnHead = true ;
						}
						else if ( child2.type === 'tableHeadCell' ) {
							child2.isColumnHead = true ;
						}
					}
				}

				tableHeadRow = child ;
				if ( thick ) { tableHeadRow.rowSeparator = true ; }
			}
			else {
				// All subsequent tableRows, are merged into the first tableHeadRow created

				if ( child.parts ) {
					for ( columnIndex = 0 ; columnIndex < child.parts.length ; columnIndex ++ ) {
						let child2 = child.parts[ columnIndex ] ;
						if ( child2.type === 'tableCell' ) {
							if ( tableHeadRow.parts[ columnIndex ] ) {
								// Merge the cells
								mergeInlineParts( tableHeadRow.parts[ columnIndex ].parts , child2.parts ) ;
							}
							else {
								//child2.type = 'tableHeadCell' ;
								child.parts[ columnIndex ] = child2 = child2.toHead() ;
								child2.isColumnHead = true ;
								tableHeadRow.parts[ columnIndex ] = child2 ;
							}
						}
						else if ( child2.type === 'tableHeadCell' ) {
							if ( tableHeadRow.parts[ columnIndex ] ) {
								// Merge the cells
								mergeInlineParts( tableHeadRow.parts[ columnIndex ].parts , child2.parts ) ;
							}
							else {
								child2.isColumnHead = true ;
								tableHeadRow.parts[ columnIndex ] = child2 ;
							}
						}
					}
				}

				table.parts.splice( index , 1 ) ;
				index -- ;
			}
		}
	}

	if ( tableHeadRow ) {
		// Compute cells indexes, columnSpan, rowSpan, column template
		computeIndexColumnSpan( ctx , table , tableHeadRow ) ;
	}

	ctx.i = lastCharOfLine + 1 ;
}



function computeIndexColumnSpan( ctx , table , tableRow ) {
	var tableCell , cellIndex , column , columnIndex , columnSpan ,
		columns = table.columns ,
		extraSpan = columns ? columns.length - tableRow.parts.length : 0 ;


	for ( cellIndex = columnIndex = 0 ; cellIndex < tableRow.parts.length ; cellIndex ++ , columnIndex ++ ) {
		tableCell = tableRow.parts[ cellIndex ] ;
		tableCell.column = columnIndex ;
		columnSpan = 1 ;

		if ( columns ) {
			column = columns[ columnIndex ] ;

			if ( column ) {
				if ( column.headColumn ) {
					if ( tableCell.type === 'tableCell' ) {
						//tableCell.type = 'tableHeadCell' ;
						tableRow.parts[ cellIndex ] = tableCell = tableCell.toHead() ;
					}

					tableCell.isRowHead = true ;
				}
			}

			while ( extraSpan > 0 && Math.abs( tableCell.ex - columns[ columnIndex ].ex ) > Math.abs( tableCell.ex - columns[ columnIndex + 1 ].ex ) ) {
				columnIndex ++ ;
				extraSpan -- ;
				columnSpan ++ ;
			}

			if ( columnSpan >= 2 ) {
				tableCell.columnSpan = columnSpan ;
			}
		}
	}
}



function parseInlineChildren( str , ctx , blockEnd , trim = false ) {
	stack( ctx ) ;
	parseInline( str , ctx , blockEnd , trim ) ;
	unstack( ctx ) ;
}



function parseInlineChildrenOfParent( str , ctx , parent , blockEnd , trim = false ) {
	stack( ctx , parent ) ;
	parseInline( str , ctx , blockEnd , trim ) ;
	unstack( ctx ) ;
}



// Try to parse non-block content
function parseInline( str , ctx , blockEnd , trim = false ) {
	//console.log( "parseInline() -- remaining:" , ctx.i , str.slice( ctx.i ) ) ;
	var isSpace , scanEnd ;

	scanEnd = blockEnd = blockEnd ?? searchEndOfLine( str , ctx.i ) ;

	if ( trim ) {
		let first = searchNextNotInSet( str , ctx.i , blockEnd , WHITE_SPACES ) ;

		if ( first === - 1 ) {
			ctx.i = blockEnd ;
			if ( str[ ctx.i ] === '\n' ) { ctx.i ++ ; }
			return ;
		}

		let last = searchPreviousNotInSet( str , blockEnd - 1 , first - 1 , WHITE_SPACES ) ;
		// The scan can't fail, 'last' can't be -1, because the forward search succeeded
		ctx.i = first ;
		scanEnd = last + 1 ;
	}

	parseNestedInline( str , ctx , scanEnd , true ) ;
}



function parseNestedInline( str , ctx , scanEnd , topLevel = false ) {
	var isSpace ,
		lastWasSpace = WHITE_SPACES.has( str[ ctx.i - 1 ] ) ;

	//console.log( "parseInline() -- remaining:" , ctx.i , str.slice( ctx.i ) ) ;

	if ( ! topLevel ) { stack( ctx ) ; }

	ctx.iStartOfInlineChunk = ctx.i ;

	for ( ; ctx.i < scanEnd ; ctx.i ++ ) {
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
			parseEmphasisText( str , ctx , scanEnd ) ;
		}
		else if ( char === '_' && ! WHITE_SPACES.has( str[ ctx.i + 1 ] ) ) {
			addInlineTextChunk( str , ctx ) ;
			parseDecoratedText( str , ctx , scanEnd ) ;
		}
		else if ( char === '`' ) {
			addInlineTextChunk( str , ctx ) ;
			parseCode( str , ctx , scanEnd ) ;
		}
		else if ( char === '[' ) {
			addInlineTextChunk( str , ctx ) ;
			parseStyledText( str , ctx , scanEnd ) ;
		}
		else if ( char === '!' && str[ ctx.i + 1 ] === '[' && lastWasSpace ) {
			addInlineTextChunk( str , ctx ) ;
			parseImage( str , ctx , scanEnd ) ;
		}

		lastWasSpace = isSpace ;
	}

	addInlineTextChunk( str , ctx ) ;

	ctx.i = scanEnd ;
	if ( str[ ctx.i ] === '\n' ) { ctx.i ++ ; }

	if ( ! topLevel ) { unstack( ctx ) ; }
}



function addInlineTextChunk( str , ctx , forcedChunk = null ) {
	var chunk = forcedChunk ?? str.slice( ctx.iStartOfInlineChunk , ctx.i ) ;

	if ( ctx.forceInlineChunkSpace ) {
		chunk = ' ' + chunk ;
		ctx.forceInlineChunkSpace = false ;
	}

	if ( chunk ) {
		let lastPart = ctx.parts[ ctx.parts.length - 1 ] ;

		if ( lastPart && lastPart.type === 'text' ) {
			lastPart.text += chunk ;
		}
		else {
			ctx.parts.push( new documentParts.Text( chunk ) ) ;
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

	if ( str[ ctx.i + 1 ] === ' ' ) {
		if ( str[ ctx.i - 1 ] === '\n' ) {
			addInlineTextChunk( str , ctx , '\n' ) ;
		}
		else if ( searchEndOfEmptyLine( str , ctx.i + 2 ) !== - 1 ) {
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



function parseEmphasisText( str , ctx , scanEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , ctx.i , '*' ) ;
	if ( streak > 3 ) { return ; }
	var end = searchSwitchCloser( str , ctx.i + streak , '*' , streak , true , false , scanEnd ) ;
	if ( end < 0 ) { return ; }

	ctx.parts.push( new documentParts.EmphasisText( streak ) ) ;

	ctx.i += streak ;
	parseNestedInline( str , ctx , end + 1 - streak ) ;

	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
}



function parseDecoratedText( str , ctx , scanEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , ctx.i , '_' ) ;
	if ( streak > 2 ) { return ; }
	var end = searchSwitchCloser( str , ctx.i + streak , '_' , streak , true , false , scanEnd ) ;
	if ( end < 0 ) { return ; }

	ctx.parts.push( new documentParts.DecoratedText( streak ) ) ;

	ctx.i += streak ;
	parseNestedInline( str , ctx , end + 1 - streak ) ;

	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
}



function parseCode( str , ctx , scanEnd ) {
	//console.error( "parseStyledText()" ) ;
	var streak = countStreak( str , ctx.i , '`' ) ;
	// Markdown supports inline code inside two pairs of backquote, to allow backquote in code, hence streak can be 2.
	if ( streak > 2 ) { return ; }
	var end = searchSwitchCloser( str , ctx.i + streak , '`' , streak , false , false , scanEnd ) ;
	if ( end < 0 ) { return ; }

	var sliceStart = ctx.i + streak ,
		sliceEnd = end + 1 - streak ;

	if ( str[ sliceStart ] === ' ' && str[ sliceStart + 1 ] === '`' ) { sliceStart ++ ; }
	if ( str[ sliceEnd - 1 ] === ' ' && str[ sliceEnd - 2 ] === '`' ) { sliceEnd -- ; }

	var text = str.slice( sliceStart , sliceEnd ) ;

	ctx.parts.push( new documentParts.Code( text ) ) ;
	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
}



const STYLE_DATA_MARK = {
	text: true , href: true , style: true , extra: false
} ;

function parseStyledText( str , ctx , scanEnd ) {
	//console.error( "parseStyledText()" ) ;
	var end = searchCloser( str , ctx.i + 1 , '[' , ']' , false , scanEnd ) ;
	if ( end < 0 ) { return ; }

	//var text = str.slice( ctx.i + 1 , end ) ;

	var start = ctx.i + 1 ;
	ctx.i = end ;
	var data = parseDataMark( str , ctx , STYLE_DATA_MARK , scanEnd ) ;
	if ( ! data ) { return ; }

	var fullMarkupEnd = ctx.i ;

	var href = data.href?.[ 0 ] ,
		style = data.style?.[ 0 ] ,
		title = data.text?.[ 0 ] ;

	if ( href ) {
		ctx.parts.push( new documentParts.Link( href , style , title ) ) ;
	}
	else if ( style || title ) {
		ctx.parts.push( new documentParts.StyledText( style , title ) ) ;
	}
	else {
		return ;
	}

	ctx.i = start ;
	parseNestedInline( str , ctx , end ) ;

	ctx.i = fullMarkupEnd ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
}



const IMAGE_DATA_MARK = {
	text: true , href: true , style: false , extra: false
} ;

function parseImage( str , ctx , scanEnd ) {
	//console.error( "parseStyledText()" ) ;
	var end = searchCloser( str , ctx.i + 2 , '[' , ']' , false , scanEnd ) ;
	if ( end < 0 ) { return ; }

	var text = str.slice( ctx.i + 2 , end ) ;

	ctx.i = end ;
	ctx.iStartOfInlineChunk = ctx.i + 1 ;
	var data = parseDataMark( str , ctx , IMAGE_DATA_MARK , scanEnd ) ;
	if ( ! data ) { return ; }

	var href = data.href?.[ 0 ] ;

	if ( href ) {
		ctx.parts.push( new documentParts.Image( href , text , data.text?.[ 0 ] ) ) ;
	}
	else {
		ctx.parts.push( new documentParts.Pictogram( text , data.text?.[ 0 ] , data.text?.[ 1 ] ) ) ;
	}
}



function parseDataMark( str , ctx , allow , scanEnd , forTextElement = true ) {
	var end ,
		data = {} ;

	for ( ;; ) {
		if ( str[ ctx.i + 1 ] === '[' && allow.text ) {
			end = searchCloser( str , ctx.i + 2 , '[' , ']' , false , scanEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.text ) { data.text = [] ; }
			data.text.push( str.slice( ctx.i + 2 , end ) ) ;
			ctx.i = end ;
			ctx.iStartOfInlineChunk = ctx.i + 1 ;
		}
		else if ( str[ ctx.i + 1 ] === '(' && allow.href ) {
			end = searchCloser( str , ctx.i + 2 , '(' , ')' , true , scanEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.href ) { data.href = [] ; }
			data.href.push( str.slice( ctx.i + 2 , end ) ) ;
			ctx.i = end ;
			ctx.iStartOfInlineChunk = ctx.i + 1 ;
		}
		else if ( str[ ctx.i + 1 ] === '<' && allow.style ) {
			end = searchCloser( str , ctx.i + 2 , '<' , '>' , true , scanEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.style ) { data.style = [] ; }
			//data.style.push( str.slice( ctx.i + 2 , end ) ) ;
			let style = Style.parse( str.slice( ctx.i + 2 , end ) , forTextElement ) ;
			data.style.push( style ) ;
			//console.error( "Parsed style:" , style ) ;
			ctx.i = end ;
			ctx.iStartOfInlineChunk = ctx.i + 1 ;
		}
		/*
		else if ( str[ ctx.i + 1 ] === '{' && allow.extra ) {
			end = searchCloser( str , ctx.i + 2 , '{' , '}' , false , scanEnd ) ;
			if ( end < 0 ) { return ; }
			if ( ! data.extra ) { data.extra = [] ; }
			data.extra.push( str.slice( ctx.i + 2 , end ) ) ;
			ctx.i = end ;
			ctx.iStartOfInlineChunk = ctx.i + 1 ;
		}
		*/
		else {
			break ;
		}
	}

	return data ;
}



function postProcessTableRowSpan( table ) {
	var tableRow , tableCell , masterCell , lastRow , lastContinueRowSpan ;

	// First pass: merge cells
	for ( tableRow of table.parts ) {
		if ( tableRow.type !== 'tableRow' ) { continue ; }

		if ( lastContinueRowSpan ) {
			for ( let columnIndex of lastContinueRowSpan ) {
				tableCell = searchColumn( tableRow , columnIndex ) ;
				masterCell = searchColumn( lastRow , columnIndex ) ;
				if ( tableCell && masterCell ) {
					if ( masterCell.masterCell ) { masterCell = masterCell.masterCell ; }
					mergeInlineParts( masterCell.parts , tableCell.parts ) ;
					masterCell.rowSpan = ( masterCell.rowSpan || 1 ) + 1 ;
					tableCell.masterCell = masterCell ;
				}
			}
		}

		lastRow = tableRow ;
		lastContinueRowSpan = tableRow.continueRowSpan ;
	}

	// Second pass: remove dead cells
	for ( tableRow of table.parts ) {
		if ( tableRow.type !== 'tableRow' ) { continue ; }
		inPlaceFilter( tableRow.parts , tableCell_ => ! tableCell_.masterCell ) ;
	}
}



// Merge two inline parts blocks, adding an extra space joint in between if necessary
function mergeInlineParts( parts , extraParts ) {
	if ( ! extraParts.length ) { return ; }

	if ( ! parts.length ) {
		parts.push( ... extraParts ) ;
		return ;
	}

	var lastPart = parts[ parts.length - 1 ] ,
		firstExtraPart = extraParts[ 0 ] ;

	var needExtraSpace = ! WHITE_SPACES.has( lastPart.text[ lastPart.text.length - 1 ] ) && ! WHITE_SPACES.has( firstExtraPart.text[ 0 ] ) ;

	if ( lastPart.type === 'text' && firstExtraPart.type === 'text' ) {
		// Combine the last existing with the first additional part
		if ( needExtraSpace ) { lastPart.text += ' ' + firstExtraPart.text ; }
		else { lastPart.text += firstExtraPart.text ; }
		for ( let i = 1 ; i < extraParts.length ; i ++ ) { parts.push( extraParts[ i ] ) ; }

		return ;
	}

	if ( needExtraSpace ) {
		if ( lastPart.type === 'text' ) {
			lastPart.text += ' ' ;
		}
		if ( firstExtraPart.type === 'text' ) {
			firstExtraPart.text = ' ' + firstExtraPart.text ;
		}
		else {
			// Add an additional joint part
			parts.push( new documentParts.Text( ' ' ) ) ;
		}
	}

	parts.push( ... extraParts ) ;
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
		if ( str[ i ] !== '\t' && str[ i ] !== ' ' ) { return - 1 ; }
	}

	return str.length ;
}



function searchLastCharOfLine( str , i ) {
	var length = str.length ,
		lastCharIndex = - 1 ;

	for ( ; i < length ; i ++ ) {
		if ( str[ i ] === '\n' ) { return lastCharIndex ; }
		if ( ! WHITE_SPACES.has( str[ i ] ) ) { lastCharIndex = i ; }
	}

	return lastCharIndex ;
}



function searchNext( str , start , end , nextChar ) {
	for ( let i = start ; i < end ; i ++ ) {
		if ( str[ i ] === '\n' ) { return - 1 ; }
		if ( str[ i ] === '\\' && str[ i + 1 ] !== '\n' ) { i ++ ; continue ; }
		if ( str[ i ] === nextChar ) { return i ; }
	}

	return - 1 ;
}



function searchPrevious( str , start , end , previousChar ) {
	for ( let i = start ; i > end ; i -- ) {
		if ( str[ i ] === '\n' ) { return - 1 ; }
		if ( str[ i - 1 ] === '\\' ) { i -- ; continue ; }
		if ( str[ i ] === previousChar ) { return i ; }
	}

	return - 1 ;
}



// notInSet is a Set
function searchNextNotInSet( str , start , end , notInSet ) {
	for ( let i = start ; i < end ; i ++ ) {
		if ( str[ i ] === '\n' ) { return - 1 ; }
		if ( str[ i ] === '\\' && str[ i + 1 ] !== '\n' ) { i ++ ; continue ; }
		if ( ! notInSet.has( str[ i ] ) ) { return i ; }
	}

	return - 1 ;
}



// notInSet is a Set
function searchPreviousNotInSet( str , start , end , notInSet ) {
	for ( let i = start ; i > end ; i -- ) {
		if ( str[ i ] === '\n' ) { return - 1 ; }
		if ( str[ i - 1 ] === '\\' ) { i -- ; continue ; }
		if ( ! notInSet.has( str[ i ] ) ) { return i ; }
	}

	return - 1 ;
}



function searchCloser( str , i , opener , closer , inline = false , end = str.length ) {
	var opened = 1 ;

	for ( ; i < end ; i ++ ) {
		if ( str[ i ] === '\\' && str[ i + 1 ] !== '\n' ) { i ++ ; continue ; }
		if ( inline && str[ i ] === '\n' ) { break ; }

		if ( str[ i ] === opener ) {
			opened ++ ;
		}
		else if ( str[ i ] === closer ) {
			opened -- ;
			if ( ! opened ) { return i ; }
		}
	}

	return - 1 ;
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
		if ( str[ i ] === '\\' && str[ i + 1 ] !== '\n' ) { i ++ ; continue ; }
		if ( inline && str[ i ] === '\n' ) { break ; }

		if ( str[ i ] === closer && ( ! noSpaceBefore || ! WHITE_SPACES.has( str[ i - 1 ] ) ) ) {
			streak ++ ;
			if ( streak === closerStreak && str[ i + 1 ] !== closer ) { return i ; }
		}
		else {
			streak = 0 ;
		}
	}

	return - 1 ;
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

		if ( str[ i ] === '\\' && str[ i + 1 ] !== '\n' ) { i ++ ; continue ; }

		if ( str[ i ] === closer ) {
			streak = countStreak( str , i , closer ) ;
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



/*
	Same that searchBlockSwitchCloser() but with a callback function.
*/
function searchFixedBlockSwitchCloser( str , i , fixed , end = str.length ) {
	var test , j , failed ;

	while ( i < end ) {
		// Search next line
		while ( str[ i ] !== '\n' && i < end ) { i ++ ; }

		i ++ ;

		if ( str[ i ] === '\\' && str[ i + 1 ] !== '\n' ) { i ++ ; continue ; }

		if ( str[ i ] === fixed[ 0 ] ) {
			failed = false ;
			for ( j = 1 ; j < fixed.length ; j ++ ) {
				if ( str[ i + j ] !== fixed[ j ] ) { failed = true ; break ; }
			}
			if ( ! failed ) {
				end = searchEndOfEmptyLine( str , i + fixed.length ) ;
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



function searchChildOfType( parent , type ) {
	var parts = parent.parts ;
	if ( ! parts ) { return null ; }

	for ( let i = 0 ; i < parts.length ; i ++ ) {
		let child = parts[ i ] ;
		if ( child.type === type ) { return child ; }
	}

	return null ;
}



function searchLastChildOfType( parent , type ) {
	var parts = parent.parts ;
	if ( ! parts ) { return null ; }

	for ( let i = parts.length - 1 ; i >= 0 ; i -- ) {
		let child = parts[ i ] ;
		if ( child.type === type ) { return child ; }
	}

	return null ;
}



function searchColumn( tableRow , column ) {
	for ( let tableCell of tableRow.parts ) {
		if ( tableCell.column === column ) { return tableCell ; }
	}

	return null ;
}



function stack( ctx , parent = ctx.parts[ ctx.parts.length - 1 ] ) {
	ctx.stack.push( {
		parts: ctx.parts ,
		parent: ctx.parent ,
		iEndOfBlock: ctx.iEndOfBlock
	} ) ;

	ctx.parent = parent ;
	ctx.parts = parent.parts = parent.parts || [] ;
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

