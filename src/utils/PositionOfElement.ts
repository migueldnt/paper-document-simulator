import Flow from "../Flow";

export default class PositionOfElement {

    public positionInFlow: number = NOT_CALCULATED_VALUE_YET
    public fragments: Array<FragmentOfElement> = []
    private _flow: Flow

    constructor() {

    }


    public get flow(): Flow {
        return this._flow
    }

    

    public set flow(flow:Flow){
        this._flow = flow
    }

    public getHeightInPagesAndColumns():Object{
        let height_dictionary:Object = this.fragments.reduce((acum,current)=>{
            if(!(current.page+"" in acum)){
                acum[current.page+""] = {}
            }
            if(!(current.flowColumn+"" in acum[current.page+""])){
                acum[current.page+""][current.flowColumn+""] = 0
            }
            
            acum[current.page+""][current.flowColumn+""] = acum[current.page+""][current.flowColumn+""] 
                + current.height

            return acum
        },{})

        /*
        const maximumHeightInPage = Object.keys(height_dictionary).reduce((acum,keyPage)=>{
            const medidasFlowInPage = Object.entries(height_dictionary[keyPage]).map(entrie=> <number>entrie[1])
            acum[keyPage] = Math.max( ...medidasFlowInPage)
            return acum
        },0)
        */

        return height_dictionary
        
    }
    
}

export const NOT_CALCULATED_VALUE_YET: number = -1;


export interface FragmentOfElement {
    flowColumn: number;
    height: number;
    width: number;
    page: number;
    startCoordinate: number[];
}