package ru.prorab.onboarding.service;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.prorab.onboarding.entity.*;
import ru.prorab.onboarding.repository.*;
import ru.prorab.onboarding.dto.*;
import ru.prorab.project.repository.ProjectRepository;
import ru.prorab.project.model.ProjectStatus;
import ru.prorab.common.exception.*;
import java.time.*;
import java.util.*;
@Service
public class AccessService {
 private final AccessRepository users;
 private final AllocationRepository allocations;
 private final EventRepository events;
 private final ProjectRepository projects;
 public AccessService(AccessRepository users, AllocationRepository allocations, EventRepository events, ProjectRepository projects) {
  this.users=users;this.allocations=allocations;this.events=events;this.projects=projects;
 }
 @Transactional public void assign(UUID userId, UUID projectId) {
  Allocation sequence=allocations.locked();
  if(users.existsById(userId))return;
  boolean completed=projects.existsByOwnerIdAndStatus(userId,ProjectStatus.COMPLETED);
  UserAccess u=new UserAccess();u.userId=userId;u.firstProjectId=projectId;u.assignedAt=Instant.now();
  u.userGroup=completed?"B":sequence.nextNumber++%2==0?"A":"B";
  u.assignmentSource=completed?"completed_project":"alternating";
  users.saveAndFlush(u);event(u,"user_group_assigned",u.userGroup+":"+u.assignmentSource);
 }
 @Transactional(readOnly=true) public AccessResponse get(UUID id) {return response(find(id));}
 @Transactional public AccessResponse viewed(UUID id) {
  UserAccess u=locked(id);
  if(required(u)&&!u.questionnaireShown){u.questionnaireShown=true;event(u,"onboarding_questionnaire_viewed","version=1");}
  return saved(u);
 }
 @Transactional public AccessResponse submit(UUID id, AnswersRequest r) {
  UserAccess u=locked(id);
  if(u.questionnaireCompletedAt!=null){
   if(!Objects.equals(u.firstRenovation,r.firstRenovation())||!Objects.equals(u.renovationManager,r.renovationManager())||!Objects.equals(u.renovationStage,r.renovationStage()))
    throw new BusinessException("Ответы уже сохранены. Первоначальная анкета не изменяется.");
   return response(u);
  }
  if(!required(u))throw new BusinessException("Анкета для этого пользователя не требуется");
  u.questionnaireShown=true;u.questionnaireVersion=r.questionnaireVersion();u.firstRenovation=r.firstRenovation();
  u.renovationManager=r.renovationManager();u.renovationStage=r.renovationStage();u.questionnaireCompletedAt=persistedNow();
  event(u,"onboarding_questionnaire_submitted","version=1;firstRenovation="+u.firstRenovation+";manager="+u.renovationManager+";stage="+u.renovationStage);
  return saved(u);
 }
 @Transactional public AccessResponse startTrial(UUID id) {
  UserAccess u=locked(id);
  if(!u.userGroup.equals("A"))throw new BusinessException("Пробный период недоступен для этой группы");
  if(required(u))throw new BusinessException("Сначала заполните анкету");
  if(u.freemiumStartedAt==null){u.freemiumStartedAt=persistedNow();u.freemiumEndsAt=u.freemiumStartedAt.plus(Duration.ofDays(7));
   event(u,"freemium_access_started",u.freemiumStartedAt+"/"+u.freemiumEndsAt);}
  return saved(u);
 }
 @Transactional public AccessResponse offerViewed(UUID id) {
  UserAccess u=locked(id);u.offerShown=true;event(u,"subscription_prompt_shown",u.userGroup);return saved(u);
 }
 @Transactional(propagation=org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
 public void assignmentFailed(UUID userId) {
  OnboardingEvent e=new OnboardingEvent();e.id=UUID.randomUUID();e.userId=userId;
  e.eventName="user_group_assignment_error";e.occurredAt=Instant.now();e.details="error_code=ASSIGNMENT_FAILED";events.save(e);
 }
 private boolean required(UserAccess u){return !u.assignmentSource.equals("completed_project")&&u.questionnaireCompletedAt==null;}
 private UserAccess find(UUID id){return users.findById(id).orElseThrow(()->new ResourceNotFoundException("Сначала сохраните первый проект"));}
 private UserAccess locked(UUID id){return users.locked(id).orElseThrow(()->new ResourceNotFoundException("Сначала сохраните первый проект"));}
 private AccessResponse saved(UserAccess u){return response(users.saveAndFlush(u));}
 private static Instant persistedNow(){return Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);}
 private AccessResponse response(UserAccess u){
  boolean full=u.subscriptionStatus.equals("connected")||(u.freemiumEndsAt!=null&&Instant.now().isBefore(u.freemiumEndsAt));
  return new AccessResponse(u.userGroup,u.assignmentSource,u.firstProjectId,required(u),u.questionnaireShown,u.questionnaireVersion,
   u.firstRenovation,u.renovationManager,u.renovationStage,u.questionnaireCompletedAt,u.freemiumStartedAt,u.freemiumEndsAt,
   u.offerShown,u.userGroup.equals("A")&&u.freemiumStartedAt==null,full,u.subscriptionStatus,u.version);
 }
 private void event(UserAccess u,String name,String details){OnboardingEvent e=new OnboardingEvent();e.id=UUID.randomUUID();e.userId=u.userId;
  e.projectId=u.firstProjectId;e.eventName=name;e.occurredAt=Instant.now();e.details=details;events.save(e);}
}
