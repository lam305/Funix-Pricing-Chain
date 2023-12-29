//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Session.sol";


contract Main {
    address public immutable admin;
    address[] public participantsRegistered;
    Session[] public sessions;
    
    struct Participant {
        address account;
        string name;
        string email;
        uint256 deviation;
        uint sessionJoinedCount;
        bool approved;
    }

    Session.SessionInfo public SessionInfo;

    mapping(address => Participant) public participants;
    
    constructor(){
        admin = msg.sender;
    }

    modifier onlyAdmin(){
        require(msg.sender == admin, "only admin can do this");
        _;
    }
    
    modifier onlyRegistered(){
        address account = participants[msg.sender].account;
        require(account != address(0),"not a registered");
        _;
    }

    function createNewSession(
        string memory _productName,
        string memory _productDescription,
        string[] memory _productImgHash,
        uint256 _sessionTime
    ) external onlyAdmin {
        Session newSession = new Session(
            admin,
            _productName,
            _productDescription,
            _productImgHash,
            _sessionTime,
            0,
            address(this)
        );
        sessions.push(newSession);

    }

    function register(string memory _name, string memory _email) external returns(bool){
        require(participants[msg.sender].account == address(0), "already registered");
        require(participantsRegistered.length < 10, "Maximum 10 participants");
        Participant memory newParticipant = Participant({
            account: msg.sender,
            name: _name,
            email: _email,
            deviation: 0,
            sessionJoinedCount: 0,
            approved: false
        });

        participants[msg.sender] = newParticipant;
        participantsRegistered.push(msg.sender);
        return true;
    }
    
    function approvedParticipant(address _participant) external onlyAdmin {
        require(participants[_participant].account != address(0), "participant is not registered");
        participants[_participant].approved = true;
    }


    function updateDeviation(uint256 _deviation, address _participant) external {
        participants[_participant].deviation = _deviation;
    }

    function updateSessionJoinedCount(address _account) external {
        participants[_account].sessionJoinedCount += 1; 
    }

    function getParticipant() external view onlyRegistered returns(Participant memory){
        return participants[msg.sender];
    }

    function getParticipantList() external onlyAdmin view returns(Participant[] memory){
        Participant[] memory _participants = new Participant[](
            participantsRegistered.length
        );
        for (uint256 i = 0; i < participantsRegistered.length; i++){
            Participant memory _participant = participants[participantsRegistered[i]];
            _participants[i] = _participant;
        }
        return _participants;
    }

    function getParticipantsAddress() external view returns(address[] memory){
        return participantsRegistered;
    }

    function getSessionsInfo() external view returns(Session.SessionInfo[] memory){
        Session.SessionInfo[] memory _sessionsInfo = new Session.SessionInfo[](sessions.length);      
        for(uint i = 0 ; i < sessions.length ; i++){
            Session.SessionInfo memory _session = sessions[i].getSessionInfo();
            _sessionsInfo[i] = _session;
        }
        return _sessionsInfo;
    }
    
    function getTimesLeft() external view returns(uint[] memory){
        uint[] memory timesLeft = new uint[](sessions.length);
        for(uint i = 0 ; i < sessions.length ; i++){
            timesLeft[i] = sessions[i].getTimesLeft();
        }  
        return timesLeft;
    }

    function changeParticipantInfo(
        string memory _name, 
        string memory _email) 
    external onlyRegistered {
        participants[msg.sender].name = _name;
        participants[msg.sender].email = _email;
    }

    function getParticipantProposePrices() external view returns(uint[] memory){
        uint[] memory _prices = new uint[](sessions.length);
        for(uint i = 0 ; i < sessions.length ; i++){
            _prices[i] = sessions[i].getParticipantProposePrice(msg.sender);
        }  
        return _prices;
    }
    
    
}
