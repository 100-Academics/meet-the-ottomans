
export class class Battle{
    private timePeriod: number; // what time period the battle takes place in
    private location: [number, number]; // location on the map. x, y = lat, long. Input as degrees. Will be converted to radians in the return function.
    private name: string; // name of the battle

    constructor(timePeriod: number, location: [number, number], name: string){
        this.timePeriod = timePeriod;
        this.location = location;
        this.name = name;
    }

    getTimePeriod(): number{
        return this.timePeriod;
    }

    getLocation(): [number, number]{
        // convert from degrees to radians
        const lat = this.location[0] * Math.PI / 180;
        const long = this.location[1] * Math.PI / 180;
        return [lat, long];
    }

    getName(): string{
        return this.name;
    }
}