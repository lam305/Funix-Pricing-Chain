//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;
import "./Main.sol";

contract Session{
    // use immutable for saving gas.
    // not use constant cause constant must be assigned values right from the time of declaration
    address public immutable admin;
    string public productName;
    string public productDescription;
    string[] public productImgHash;
    address[] public participantsAddress;
    uint public suggestedPrice;
    uint public realPrice;
    Main public mainContract;
    uint public immutable startTime;
    uint public immutable sessionTime;
    mapping(address => uint) public participantProposePrice;
    enum State {OPENED, CLOSED}
    State public state;

    struct SessionInfo {
        address sessionAddress;
        string productName;
        string productDescription;
        string[] productImages;
        State state;
        uint256 realPrice;
        uint256 suggestedPrice;   
    }

    constructor(
        address _admin,
        string memory _productName,
        string memory _productDescription,
        string[] memory _productImgHash,
        uint _sessionTime,
        uint _realPrice,
        address _mainContract
    ){      
        productName = _productName;
        productDescription = _productDescription;
        productImgHash = _productImgHash;
        startTime = block.timestamp;
        sessionTime = _sessionTime;
        realPrice = _realPrice;
        state = State.OPENED;
        mainContract = Main(_mainContract);
        admin = _admin;
    }

    modifier onlyAdmin(){
        require(msg.sender == admin, "only admin can do this");
        _;
    }

    modifier validState(State _state){
        require(state == _state, "Invalid state");
        _;
    }
    modifier approved(){
        (, , , , , bool _approved) = mainContract.participants(msg.sender);
        require(_approved , "invalid participant");
        _;
    }
    modifier duringSession(){
        require(block.timestamp <= startTime + sessionTime, "Session is ended");
        _;
    }
    
    function proposeProductPrice(uint _price) public 
        approved
        validState(State.OPENED) 
        duringSession{
        require(_price > 0, "the price must be bigger than 0");
        // If the price has not been proposed, session join count will be increased by 1
        // Otherwise, the previous proposed price will be update
         if(participantProposePrice[msg.sender] == 0){
            participantsAddress.push(msg.sender);
            mainContract.updateSessionJoinedCount(msg.sender);
        }
        participantProposePrice[msg.sender] = _price;
    }

    function caculateProposePrice() internal {    
        //Used in the 'endSession' scenario when no one has proposed a product yet.
        if(participantsAddress.length == 0){
            suggestedPrice = 0;
        }else{
        //Update the deviation from the main contract to calculate based on the formula.
            uint totalPrice;
            uint totalPrecision;
            for(uint i = 0; i < participantsAddress.length; i++){
                (, , ,uint _deviation, ,) = mainContract.participants(participantsAddress[i]);
                totalPrice += 
                participantProposePrice[participantsAddress[i]] 
                * (100 - _deviation);
                totalPrecision += (100 - _deviation);
            }
            suggestedPrice = totalPrice/totalPrecision;
        }  
    }

    function caculateParticipantDeviation(address _participant) internal {
        uint newDeviation;
        uint participantPrice = participantProposePrice[_participant];
        if(participantPrice > realPrice){
            newDeviation = (participantPrice  - realPrice) * 100 / realPrice;
        }else{
            newDeviation = (realPrice - participantPrice) * 100 / realPrice;
        }
        (, , ,uint256 _deviation, uint256 _sessionJoinedCount, ) = 
        mainContract.participants(_participant);
        //_sessionJoinedCount needs to be reduced by 1 in the formula 
        // because it has already been incremented when a participant proposed the product
        uint accumulatedDeviation =  
        (_deviation *(_sessionJoinedCount-1) + newDeviation)
        /(_sessionJoinedCount);
  
        //update deviation of the participant in main contract   
        mainContract.updateDeviation(accumulatedDeviation, _participant);
    }
    
    function getSessionInfo() external view returns (SessionInfo memory) {
        SessionInfo memory _session = SessionInfo({
                sessionAddress: address(this),
                productName: productName,
                productDescription: productDescription,
                productImages: productImgHash,
                state: state,
                realPrice: realPrice,
                suggestedPrice: suggestedPrice    
        });
        return _session;
    }

    function endSession(uint _realPrice) public 
        onlyAdmin
        validState(State.OPENED) 
        duringSession() {
        realPrice = _realPrice;
        state = State.CLOSED;
        caculateProposePrice();
        for(uint i = 0; i < participantsAddress.length; i++){
            caculateParticipantDeviation(participantsAddress[i]);
        }
    }

    function getTimesLeft() external view returns(uint ){
        if((block.timestamp - startTime) >= sessionTime){
            return 0;
        }
        return sessionTime - (block.timestamp - startTime);
    }
    
    function getParticipantProposePrice(address _participant) external view returns(uint ){
        uint _price = participantProposePrice[_participant];
        return _price;
    }
}
