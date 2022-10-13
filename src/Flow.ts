import Pages from "./Pages"
import ElementInPage, { CounterSize } from "./utils/ElementInPage"
import { NOT_CALCULATED_VALUE_YET } from "./utils/PositionOfElement"
import PositionOfFlow, { FragmentOfFlow } from "./utils/PositionOfFlow"
import { factorCm2Px } from "./utils/Sizes"
import { BehaviorSubject } from "rxjs"

export default class Flow {
    private _id: string
    private _pagesInstance: Pages
    private _elements: Array<ElementInPage> = []
    private _position: PositionOfFlow

    public columns: number
    public widthFractions: Array<number>
    public gap: number
    public autoDisributeContent: boolean

    //listeners
    public positionBehaviorSubject: BehaviorSubject<PositionOfFlow> = new BehaviorSubject<PositionOfFlow>(this.position)



    constructor(flowOptions: FlowOptions) {
        this._id = flowOptions.id
        this.columns = flowOptions.columns
        this.widthFractions = flowOptions.widthFractions
        this.gap = flowOptions.gap
        this.autoDisributeContent = flowOptions.autoDisributeContent
        this._position = new PositionOfFlow()

    }

    public get id(): string {
        return this._id
    }

    public get elements(): Array<ElementInPage> {
        return this._elements
    }

    public get pagesInstance(): Pages {
        return this._pagesInstance
    }

    public get position(): PositionOfFlow {
        return this._position
    }

    public get widthsColumnsInPixels(): number[] {
        const gapInPx = this.gap * factorCm2Px
        const totalWidhtMinusGap = this._pagesInstance.sizePageInPixelsMinusMargins[0] - (gapInPx * (this.columns - 1))
        return this.widthFractions.map((fractions) => {
            return totalWidhtMinusGap * fractions
        })
    }


    public addToPagesInstance(pages: Pages) {
        this._pagesInstance = pages
        const size = this._pagesInstance.flows.length
        this._pagesInstance.flows.push(this)
        this._position.positionInPage = size

    }

    public addElementInPosition(element: ElementInPage, position?: number) {
        element.positionBehaviorSubject.asObservable().subscribe(position => {
            this.positionate()
        })
        if (position === undefined || position > this._elements.length) {
            this._elements.push(element)
            element.position.positionInFlow = this._elements.length - 1
            return
        }
        this._elements.splice(position, 0, element)
        element.position.positionInFlow = position
    }

    public previusSpaceFragmentsFromPage(): LastSpaceUsed {
        let counter = { "0": { height: 0 } }
        const indexThisFlow = this._pagesInstance.flows.findIndex(flow => flow.id === this.id)
        this._pagesInstance.flows.filter((flow, idx) => idx < indexThisFlow)
            .forEach(flow => {
                flow.position.fragments.forEach(fragment => {
                    let page = fragment.page
                    if (!(page in counter)) {
                        counter[page] = { height: 0 }

                    }
                    counter[page].height = counter[page].height + fragment.height
                })
            })

        //last page, last column 
        const lastPage = Object.keys(counter).sort((a, b) => a > b ? -1 : 1)[0];
        
        return { last: { page: lastPage }, counter: counter }
    }


    public positionate() {
        console.log("posicionando en Flow", this.id)
        const previusSpace = this.previusSpaceFragmentsFromPage();
        
        const spaceReservedByOthers = previusSpace.counter[previusSpace.last.page].height 
        
        this._position.startCoordinate[0] = this._pagesInstance.pageMargins[3] * factorCm2Px
        //this.position.startCoordinate[1] = this.pagesInstance.sizePageInPixelsMinusMargins[1] - spaceReservedByOthers
        this._position.startCoordinate[1] = (this._pagesInstance.pageMargins[0] * factorCm2Px) + spaceReservedByOthers
        //const availableHeightToFlow = this.pagesInstance.sizePageInPixelsMinusMargins[1]
        

        const grossHeightInPagesOfElements = this._elements.map(element => {
            return element.position.getHeightInPagesAndColumns()
        }).reduce((acum, currentObjectMeasuresOfPage) => {
            Object.keys(currentObjectMeasuresOfPage).forEach(pageKey => {
                if (!(pageKey in acum)) {
                    acum[pageKey] = {}
                }
                Object.keys(currentObjectMeasuresOfPage[pageKey]).forEach(flowColumn => {
                    if (!(flowColumn in acum[pageKey])) {
                        acum[pageKey][flowColumn] = 0
                    }
                    acum[pageKey][flowColumn] = acum[pageKey][flowColumn]
                        + currentObjectMeasuresOfPage[pageKey][flowColumn]
                })

                //acum[pageKey] = acum[pageKey] + currentObjectMeasuresOfPage[pageKey]
            })
            return acum
        }, {})

        //console.log(grossHeightInPagesOfElements,"height brutos de los elementos de este flow",this.id)

        const maximumHeightByPage = Object.keys(grossHeightInPagesOfElements)
            .reduce((acum, keyPage) => {
                const medidasByFlowInPage = Object.entries(grossHeightInPagesOfElements[keyPage])
                    .map(entrie => {
                        return <number>entrie[1]
                    })

                acum[keyPage] = Math.max(...medidasByFlowInPage)
                return acum
            }, {})

        this._position.fragments = []
        let contadorHeight: { [key: string]: number } = {}
        contadorHeight[previusSpace.last.page] = this._position.startCoordinate[1]

        Object.entries(maximumHeightByPage).forEach(([keyPage, value]) => {
            
            if (!(keyPage in contadorHeight)) {
                contadorHeight[keyPage] = this._pagesInstance.pageMargins[0] * factorCm2Px
            }
            const fragment: FragmentOfFlow = {
                height: <number>value,
                page: parseInt(keyPage),
                width: this._pagesInstance.sizePageInPixelsMinusMargins[0],
                startCoordinate: [
                    this._pagesInstance.pageMargins[3] * factorCm2Px,
                    contadorHeight[keyPage]
                ]

            }

            this._position.fragments.push(fragment)
        })

        this.positionBehaviorSubject.next(this.position)
    }

    /**
     * Retorna la coordenana inicial del numero de columna que se le indique, esto en la primera pagina donde inicia el flow
     * o mejor tambien definir la pagina para mas exactitud ???
     * @param idxColumn 
     * @returns {[number,number]}
     */
    public getStartCoordinateByColumn(idxColumn:number):[number,number]{
        const previusColumns =[...this.widthsColumnsInPixels].slice(0,idxColumn)
        let positionX = previusColumns.reduce((acum,current)=>{
            acum = acum + current
            return acum
        },0)

        const gapInPx = previusColumns.length>0 ? this.gap * factorCm2Px * (previusColumns.length) : 0

        positionX = this.position.startCoordinate[0]+ positionX + gapInPx

        return [positionX,this.position.startCoordinate[1]]
        

    }

    public getStartCoordinateByColumnInPage(idxPage:number,idxColumn:number){
        const previusColumns =[...this.widthsColumnsInPixels].slice(0,idxColumn)
        let positionX = previusColumns.reduce((acum,current)=>{
            acum = acum + current
            return acum
        },0)

        const gapInPx = previusColumns.length>0 ? this.gap * factorCm2Px * (previusColumns.length) : 0

        
        const coordinateBeginInPage = this.position.fragments.find(fragment=>fragment.page === idxPage)?.startCoordinate
        if(!coordinateBeginInPage){
            //retornar algo inicial para la pagina
            return [this.pagesInstance.pageMargins[3] * factorCm2Px , this.pagesInstance.pageMargins[0] * factorCm2Px]
        }

        positionX = coordinateBeginInPage[0]+ positionX + gapInPx

        return [positionX,coordinateBeginInPage[1]]
    }
}


export interface FlowOptions {
    id: string;
    columns: number;
    widthFractions: Array<number>;
    gap: number;
    autoDisributeContent: boolean;
}

export interface CounterPage {
    [key: string]: CounterSize;
}

export interface LastSpaceUsed {
    last: { page: string };
    counter: CounterPage
}