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



const documentParts = {} ;
module.exports = documentParts ;



function Part() {}

documentParts.Part = Part ;



function InlinePart() {}

InlinePart.prototype = Object.create( Part.prototype ) ;
InlinePart.prototype.constructor = InlinePart ;
documentParts.InlinePart = InlinePart ;



function InlineContainerPart() {
	this.parts = [] ;
}

InlineContainerPart.prototype = Object.create( Part.prototype ) ;
InlineContainerPart.prototype.constructor = InlineContainerPart ;
documentParts.InlineContainerPart = InlineContainerPart ;



function InlineTextPart( text ) {
	this.text = text ;
}

InlineTextPart.prototype = Object.create( Part.prototype ) ;
InlineTextPart.prototype.constructor = InlineTextPart ;
documentParts.InlineTextPart = InlineTextPart ;



function BlockPart() {}

BlockPart.prototype = Object.create( Part.prototype ) ;
BlockPart.prototype.constructor = BlockPart ;
documentParts.BlockPart = BlockPart ;



function BlockContainerPart() {
	this.parts = [] ;
}

BlockContainerPart.prototype = Object.create( Part.prototype ) ;
BlockContainerPart.prototype.constructor = BlockContainerPart ;
documentParts.BlockContainerPart = BlockContainerPart ;



// Inline Parts

function Text( text ) {
	this.type = 'text' ;
	InlineTextPart.call( this , text ) ;
}

Text.prototype = Object.create( InlineTextPart.prototype ) ;
Text.prototype.constructor = Text ;
documentParts.Text = Text ;



function EmphasisText( level ) {
	this.type = 'emphasisText' ;
	this.level = level ;
	InlineContainerPart.call( this ) ;
}

EmphasisText.prototype = Object.create( InlineContainerPart.prototype ) ;
EmphasisText.prototype.constructor = EmphasisText ;
documentParts.EmphasisText = EmphasisText ;



function DecoratedText( level ) {
	this.type = 'decoratedText' ;
	this.level = level ;
	this.underline = true ;
	InlineContainerPart.call( this ) ;
}

DecoratedText.prototype = Object.create( InlineContainerPart.prototype ) ;
DecoratedText.prototype.constructor = DecoratedText ;
documentParts.DecoratedText = DecoratedText ;



function Code( text ) {
	this.type = 'code' ;
	InlineTextPart.call( this , text ) ;
}

Code.prototype = Object.create( InlineTextPart.prototype ) ;
Code.prototype.constructor = Code ;
documentParts.Code = Code ;



function Link( href , style , hint ) {
	this.type = 'link' ;
	this.href = href ;
	this.style = style || undefined ;
	InlineContainerPart.call( this ) ;
	this.hint = hint || undefined ;
}

Link.prototype = Object.create( InlineContainerPart.prototype ) ;
Link.prototype.constructor = Link ;
documentParts.Link = Link ;



// Tooltip/Infotip/Hint displayed when hovering
function InfotipedText( hint , href , style ) {
	this.type = 'infotipedText' ;
	this.hint = hint || undefined ;
	this.href = href || undefined ;
	this.style = style || undefined ;
	InlineContainerPart.call( this ) ;
}

InfotipedText.prototype = Object.create( InlineContainerPart.prototype ) ;
InfotipedText.prototype.constructor = InfotipedText ;
documentParts.InfotipedText = InfotipedText ;



function StyledText( style , hint ) {
	this.type = 'styledText' ;
	this.style = style || undefined ;
	InlineContainerPart.call( this ) ;
	this.hint = hint || undefined ;
}

StyledText.prototype = Object.create( InlineContainerPart.prototype ) ;
StyledText.prototype.constructor = StyledText ;
documentParts.StyledText = StyledText ;



function Image( href , altText , hint ) {
	this.type = 'image' ;
	this.href = href ;
	this.altText = altText ;
	this.hint = hint || undefined ;
	InlinePart.call( this ) ;
}

Image.prototype = Object.create( InlinePart.prototype ) ;
Image.prototype.constructor = Image ;
documentParts.Image = Image ;



const emoji = require( 'string-kit/lib/emoji.js' ) ;

function Pictogram( code , altText , hint ) {
	this.type = 'pictogram' ;
	this.code = code ;

	var emojiChar = emoji.get( this.code ) ;
	this.emoji = emojiChar || undefined ;

	this.altText =
		altText ? altText :
		emojiChar ? emoji.getCanonicalName( emojiChar ) :
		undefined ;

	this.hint = hint || undefined ;

	InlinePart.call( this ) ;
}

Pictogram.prototype = Object.create( InlinePart.prototype ) ;
Pictogram.prototype.constructor = Pictogram ;
documentParts.Pictogram = Pictogram ;



// Block parts

function Paragraph() {
	this.type = 'paragraph' ;
	BlockContainerPart.call( this ) ;
}

Paragraph.prototype = Object.create( BlockContainerPart.prototype ) ;
Paragraph.prototype.constructor = Paragraph ;
documentParts.Paragraph = Paragraph ;



function Header( level ) {
	this.type = 'header' ;
	this.level = level ;
	BlockContainerPart.call( this ) ;
}

Header.prototype = Object.create( BlockContainerPart.prototype ) ;
Header.prototype.constructor = Header ;
documentParts.Header = Header ;



function Cite() {
	this.type = 'cite' ;
	BlockContainerPart.call( this ) ;
}

Cite.prototype = Object.create( BlockContainerPart.prototype ) ;
Cite.prototype.constructor = Cite ;
documentParts.Cite = Cite ;



function List( indent ) {
	this.type = 'list' ;
	this.indent = indent ;
	BlockContainerPart.call( this ) ;
}

List.prototype = Object.create( BlockContainerPart.prototype ) ;
List.prototype.constructor = List ;
documentParts.List = List ;



function ListItem( indent ) {
	this.type = 'listItem' ;
	this.indent = indent ;
	BlockContainerPart.call( this ) ;
}

ListItem.prototype = Object.create( BlockContainerPart.prototype ) ;
ListItem.prototype.constructor = ListItem ;
documentParts.ListItem = ListItem ;



function OrderedList( indent ) {
	this.type = 'orderedList' ;
	this.indent = indent ;
	this.autoIndex = 1 ;
	BlockContainerPart.call( this ) ;
}

OrderedList.prototype = Object.create( BlockContainerPart.prototype ) ;
OrderedList.prototype.constructor = OrderedList ;
documentParts.OrderedList = OrderedList ;



function OrderedListItem( indent , order , index ) {
	this.type = 'orderedListItem' ;
	this.indent = indent ;
	this.order = order ;	// User order value
	this.index = index ;	// Real index, starting at 1, and auto-incrementing
	BlockContainerPart.call( this ) ;
}

OrderedListItem.prototype = Object.create( BlockContainerPart.prototype ) ;
OrderedListItem.prototype.constructor = OrderedListItem ;
documentParts.OrderedListItem = OrderedListItem ;



function Quote( indent ) {
	this.type = 'quote' ;
	this.indent = indent ;
	BlockContainerPart.call( this ) ;
}

Quote.prototype = Object.create( BlockContainerPart.prototype ) ;
Quote.prototype.constructor = Quote ;
documentParts.Quote = Quote ;



function HorizontalRule( clearFloat ) {
	this.type = 'horizontalRule' ;
	this.clearFloat = clearFloat ;
	BlockContainerPart.call( this ) ;
}

HorizontalRule.prototype = Object.create( BlockContainerPart.prototype ) ;
HorizontalRule.prototype.constructor = HorizontalRule ;
documentParts.HorizontalRule = HorizontalRule ;



function ClearFloat() {
	this.type = 'clearFloat' ;
	BlockContainerPart.call( this ) ;
}

ClearFloat.prototype = Object.create( BlockContainerPart.prototype ) ;
ClearFloat.prototype.constructor = ClearFloat ;
documentParts.ClearFloat = ClearFloat ;



function CodeBlock( text , lang ) {
	this.type = 'codeBlock' ;
	this.lang = lang || undefined ;
	this.text = text ;
	BlockContainerPart.call( this ) ;
}

CodeBlock.prototype = Object.create( BlockContainerPart.prototype ) ;
CodeBlock.prototype.constructor = CodeBlock ;
documentParts.CodeBlock = CodeBlock ;



function Anchor( href ) {
	this.type = 'anchor' ;
	this.href = href ;
	BlockContainerPart.call( this ) ;
}

Anchor.prototype = Object.create( BlockContainerPart.prototype ) ;
Anchor.prototype.constructor = Anchor ;
documentParts.Anchor = Anchor ;



function ImageBlock( href , altText , float , caption , hint ) {
	this.type = 'imageBlock' ;
	this.href = href ;
	this.altText = altText ;
	this.float = float || undefined ;
	this.caption = caption || undefined ;
	this.hint = hint || undefined ;
	BlockPart.call( this ) ;
}

ImageBlock.prototype = Object.create( BlockPart.prototype ) ;
ImageBlock.prototype.constructor = ImageBlock ;
documentParts.ImageBlock = ImageBlock ;



function AudioBlock( href , altText , float , caption , hint ) {
	this.type = 'audioBlock' ;
	this.href = href ;
	this.altText = altText ;
	this.float = float || undefined ;
	this.caption = caption || undefined ;
	this.hint = hint || undefined ;
	BlockPart.call( this ) ;
}

AudioBlock.prototype = Object.create( BlockPart.prototype ) ;
AudioBlock.prototype.constructor = AudioBlock ;
documentParts.AudioBlock = AudioBlock ;



function VideoBlock( href , altText , float , caption , hint ) {
	this.type = 'videoBlock' ;
	this.href = href ;
	this.altText = altText ;
	this.float = float || undefined ;
	this.caption = caption || undefined ;
	this.hint = hint || undefined ;
	BlockPart.call( this ) ;
}

VideoBlock.prototype = Object.create( BlockPart.prototype ) ;
VideoBlock.prototype.constructor = VideoBlock ;
documentParts.VideoBlock = VideoBlock ;



function Table() {
	this.type = 'table' ;
	this.columns = [] ;
	this.multilineRowMode = false ;
	this.hasHeadSeparator = false ;
	this.hasRowSeparator = false ;
	this.hasRowSpan = false ;	// Useful to disable background colors based on odd/even rows
	BlockContainerPart.call( this ) ;
}

Table.prototype = Object.create( BlockContainerPart.prototype ) ;
Table.prototype.constructor = Table ;
documentParts.Table = Table ;



function TableCaption( style ) {
	this.type = 'tableCaption' ;
	this.style = style || undefined ;
	BlockContainerPart.call( this ) ;
}

TableCaption.prototype = Object.create( BlockContainerPart.prototype ) ;
TableCaption.prototype.constructor = TableCaption ;
documentParts.TableCaption = TableCaption ;



function TableRow( style ) {
	this.type = 'tableRow' ;
	this.style = style || undefined ;
	this.rowSeparator = false ;
	this.continueRowSpan = undefined ;
	BlockContainerPart.call( this ) ;
}

TableRow.prototype = Object.create( BlockContainerPart.prototype ) ;
TableRow.prototype.constructor = TableRow ;
documentParts.TableRow = TableRow ;

TableRow.prototype.toHead = function() {
	var tableHeadRow = new TableHeadRow( this.style ) ;
	tableHeadRow.rowSeparator = this.rowSeparator ;
	tableHeadRow.continueRowSpan = this.continueRowSpan ;
	tableHeadRow.parts = this.parts ;
	return tableHeadRow ;
} ;



function TableHeadRow( style ) {
	this.type = 'tableHeadRow' ;
	this.style = style || undefined ;
	this.rowSeparator = false ;
	this.continueRowSpan = undefined ;
	BlockContainerPart.call( this ) ;
}

TableHeadRow.prototype = Object.create( BlockContainerPart.prototype ) ;
TableHeadRow.prototype.constructor = TableHeadRow ;
documentParts.TableHeadRow = TableHeadRow ;



function TableCell( style ) {
	this.type = 'tableCell' ;
	this.style = style || undefined ;
	this.column = - 1 ;	// The column index
	this.columnSeparator = false ;
	this.columnSpan = 1 ;
	this.rowSpan = 1 ;
	this.sx = - 1 ;
	this.ex = - 1 ;
	this.masterCell = undefined ;
	BlockContainerPart.call( this ) ;
}

TableCell.prototype = Object.create( BlockContainerPart.prototype ) ;
TableCell.prototype.constructor = TableCell ;
documentParts.TableCell = TableCell ;

TableCell.prototype.toHead = function() {
	var tableHeadCell = new TableHeadCell( this.style ) ;
	tableHeadCell.column = this.column ;
	tableHeadCell.columnSeparator = this.columnSeparator ;
	tableHeadCell.columnSpan = this.columnSpan ;
	tableHeadCell.rowSpan = this.rowSpan ;
	tableHeadCell.sx = this.sx ;
	tableHeadCell.ex = this.ex ;
	tableHeadCell.masterCell = this.masterCell ;
	tableHeadCell.parts = this.parts ;
	return tableHeadCell ;
} ;



function TableHeadCell( style ) {
	this.type = 'tableHeadCell' ;
	this.style = style || undefined ;
	this.column = - 1 ;
	this.columnSeparator = false ;
	this.columnSpan = 1 ;
	this.rowSpan = 1 ;
	this.sx = - 1 ;
	this.ex = - 1 ;
	this.masterCell = undefined ;
	this.isColumnHead = false ;
	this.isRowHead = false ;
	BlockContainerPart.call( this ) ;
}

TableHeadCell.prototype = Object.create( BlockContainerPart.prototype ) ;
TableHeadCell.prototype.constructor = TableHeadCell ;
documentParts.TableHeadCell = TableHeadCell ;

